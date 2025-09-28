import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "phone", passwordField: "password" },
      async (phone, password, done) => {
        try {
          const user = await storage.getUserByPhone(phone);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Teléfono o contraseña incorrectos" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByPhone(validatedData.phone);
      if (existingUser) {
        return res.status(400).json({ message: "Este número de teléfono ya está registrado" });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Generate verification code (simulated SMS)
      const verificationCode = generateVerificationCode();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await storage.setVerificationCode(user.id, verificationCode, expiry);

      // In a real app, send SMS here
      console.log(`SMS Verification Code for +53${user.phone}: ${verificationCode}`);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ 
          ...user, 
          needsVerification: true,
          message: "Código de verificación enviado por SMS" 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0]?.message || "Datos de registro inválidos" 
        });
      }
      next(error);
    }
  });

  // SMS verification endpoint
  app.post("/api/verify-sms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const { code } = req.body;
    const user = await storage.getUser(req.user!.id);
    
    if (!user || !user.verificationCode || !user.verificationCodeExpiry) {
      return res.status(400).json({ message: "Código de verificación no encontrado" });
    }

    if (new Date() > user.verificationCodeExpiry) {
      return res.status(400).json({ message: "Código de verificación expirado" });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Código de verificación incorrecto" });
    }

    await storage.updateUserVerification(user.id, true);
    res.json({ message: "Teléfono verificado exitosamente" });
  });

  // Resend verification code
  app.post("/api/resend-verification", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const verificationCode = generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await storage.setVerificationCode(req.user!.id, verificationCode, expiry);

    console.log(`SMS Verification Code for +53${req.user!.phone}: ${verificationCode}`);
    res.json({ message: "Código de verificación reenviado" });
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          message: info?.message || "Credenciales inválidas" 
        });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  // Password reset request
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { phone } = req.body;
      const user = await storage.getUserByPhone(phone);
      
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const resetCode = generateVerificationCode();
      const expiry = new Date(Date.now() + 10 * 60 * 1000);
      await storage.setVerificationCode(user.id, resetCode, expiry);

      console.log(`SMS Reset Code for +53${user.phone}: ${resetCode}`);
      res.json({ message: "Código de restablecimiento enviado por SMS" });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Confirm password reset
  app.post("/api/confirm-reset", async (req, res) => {
    try {
      const { phone, code, newPassword } = req.body;
      const user = await storage.getUserByPhone(phone);
      
      if (!user || !user.verificationCode || !user.verificationCodeExpiry) {
        return res.status(400).json({ message: "Código de restablecimiento no válido" });
      }

      if (new Date() > user.verificationCodeExpiry) {
        return res.status(400).json({ message: "Código de restablecimiento expirado" });
      }

      if (user.verificationCode !== code) {
        return res.status(400).json({ message: "Código de restablecimiento incorrecto" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);
      
      res.json({ message: "Contraseña restablecida exitosamente" });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
