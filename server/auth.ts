import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Safe user serializer - NEVER expose sensitive fields
function sanitizeUser(user: SelectUser) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    province: user.province,
    isVerified: user.isVerified,
    createdAt: user.createdAt
    // NEVER include: password, verificationCode, verificationCodeExpiry
  };
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

// Secure verification code generation and hashing
function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function hashVerificationCode(code: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(code, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyCode(supplied: string, stored: string): Promise<boolean> {
  if (!supplied || !stored) return false;
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    return false;
  }
}

// Simple CSRF protection without deprecated csurf
function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

function verifyCSRFToken(sessionToken: string, bodyToken: string): boolean {
  if (!sessionToken || !bodyToken) return false;
  try {
    return timingSafeEqual(
      Buffer.from(sessionToken, 'hex'),
      Buffer.from(bodyToken, 'hex')
    );
  } catch (error) {
    return false;
  }
}

// CSRF middleware
function csrfProtection(req: any, res: any, next: any) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const sessionToken = req.session?.csrfToken;
  const bodyToken = req.body?._csrf || req.headers['x-csrf-token'];

  if (!verifyCSRFToken(sessionToken, bodyToken)) {
    return res.status(403).json({ message: "Token CSRF inválido" });
  }

  next();
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    name: 'rico.sid', // Custom session name
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: 'lax', // CSRF protection
      maxAge: 4 * 60 * 60 * 1000, // Reduced to 4 hours for security
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Add CSRF token to all sessions
  app.use((req: any, res, next) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCSRFToken();
    }
    next();
  });

  // Apply CSRF protection to state-changing auth endpoints
  app.use(['/api/login', '/api/register', '/api/verify-sms', '/api/resend-verification', 
           '/api/reset-password', '/api/confirm-reset', '/api/logout'], csrfProtection);

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

  // Add CSRF token endpoint
  app.get("/api/csrf-token", (req: any, res) => {
    res.json({ csrfToken: req.session.csrfToken });
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      // Normalize international phone number (keep + and allow up to 15 digits)
      let phoneNormalized = req.body.phone?.replace(/[^+\d]/g, '') || '';
      if (phoneNormalized.startsWith('+')) {
        phoneNormalized = phoneNormalized.substring(0, 16); // +15 digits max (international standard)
      } else {
        phoneNormalized = phoneNormalized.substring(0, 15); // 15 digits max without +
      }
      const validatedData = insertUserSchema.parse({
        ...req.body,
        phone: phoneNormalized,
        name: req.body.name?.trim(),
      });
      
      const existingUser = await storage.getUserByPhone(validatedData.phone);
      if (existingUser) {
        // Generic response to prevent user enumeration
        return res.status(400).json({ message: "Error en el registro. Verifica los datos e intenta de nuevo." });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Generate verification code (simulated SMS)
      const verificationCode = generateVerificationCode();
      const hashedCode = await hashVerificationCode(verificationCode);
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await storage.setVerificationCode(user.id, hashedCode, expiry);

      // In production, send real SMS. NEVER log in production for security
      if (process.env.NODE_ENV === "development") {
        console.log(`SMS Verification Code for ${user.phone.startsWith('+') ? user.phone : '+' + user.phone}: ${verificationCode}`);
      }

      // Regenerate session on login for security
      req.session.regenerate((err: any) => {
        if (err) return next(err);
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.status(201).json({ 
            ...sanitizeUser(user), 
            needsVerification: true,
            message: "Código de verificación enviado por SMS" 
          });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Datos de registro inválidos" // Generic message for security
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
      // Clear expired code
      await storage.clearVerificationCode(user.id);
      return res.status(400).json({ message: "Código de verificación expirado" });
    }

    // Verify hashed code with constant-time comparison
    const isValidCode = await verifyCode(code, user.verificationCode);
    if (!isValidCode) {
      return res.status(400).json({ message: "Código de verificación incorrecto" });
    }

    // Update verification status and clear code (single-use)
    await storage.updateUserVerification(user.id, true);
    await storage.clearVerificationCode(user.id);
    
    res.json({ message: "Teléfono verificado exitosamente" });
  });

  // Resend verification code
  app.post("/api/resend-verification", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const verificationCode = generateVerificationCode();
    const hashedCode = await hashVerificationCode(verificationCode);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await storage.setVerificationCode(req.user!.id, hashedCode, expiry);

    // NEVER log in production for security
    if (process.env.NODE_ENV === "development") {
      console.log(`SMS Verification Code for ${req.user!.phone.startsWith('+') ? req.user!.phone : '+' + req.user!.phone}: ${verificationCode}`);
    }
    
    res.json({ message: "Código de verificación reenviado" });
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    // Normalize international phone number (keep + and allow up to 15 digits)
    let phoneNormalized = req.body.phone?.replace(/[^+\d]/g, '') || '';
    if (phoneNormalized.startsWith('+')) {
      phoneNormalized = phoneNormalized.substring(0, 16); // +15 digits max
    } else {
      phoneNormalized = phoneNormalized.substring(0, 15); // 15 digits max without +
    }
    req.body.phone = phoneNormalized;

    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          message: "Credenciales inválidas" // Generic message
        });
      }

      // Regenerate session on successful login for security
      req.session.regenerate((sessionErr: any) => {
        if (sessionErr) return next(sessionErr);
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.json(sanitizeUser(user));
        });
      });
    })(req, res, next);
  });

  // Password reset request
  app.post("/api/reset-password", async (req, res) => {
    try {
      // Normalize international phone number
      let phoneNormalized = req.body.phone?.replace(/[^+\d]/g, '') || '';
      if (phoneNormalized.startsWith('+')) {
        phoneNormalized = phoneNormalized.substring(0, 16);
      } else {
        phoneNormalized = phoneNormalized.substring(0, 15);
      }
      const user = await storage.getUserByPhone(phoneNormalized);
      
      // Always return success to prevent user enumeration
      if (user) {
        const resetCode = generateVerificationCode();
        const hashedCode = await hashVerificationCode(resetCode);
        const expiry = new Date(Date.now() + 10 * 60 * 1000);
        await storage.setVerificationCode(user.id, hashedCode, expiry);

        // NEVER log in production for security
        if (process.env.NODE_ENV === "development") {
          console.log(`SMS Reset Code for ${user.phone.startsWith('+') ? user.phone : '+' + user.phone}: ${resetCode}`);
        }
      }

      // Always return the same response regardless of user existence
      res.json({ message: "Si el número existe, recibirás un código de restablecimiento por SMS" });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Confirm password reset
  app.post("/api/confirm-reset", async (req, res) => {
    try {
      const { phone, code, newPassword } = req.body;
      // Normalize international phone number
      let phoneNormalized = phone?.replace(/[^+\d]/g, '') || '';
      if (phoneNormalized.startsWith('+')) {
        phoneNormalized = phoneNormalized.substring(0, 16);
      } else {
        phoneNormalized = phoneNormalized.substring(0, 15);
      }
      const user = await storage.getUserByPhone(phoneNormalized);
      
      if (!user || !user.verificationCode || !user.verificationCodeExpiry) {
        return res.status(400).json({ message: "Código de restablecimiento no válido" });
      }

      if (new Date() > user.verificationCodeExpiry) {
        // Clear expired code
        await storage.clearVerificationCode(user.id);
        return res.status(400).json({ message: "Código de restablecimiento expirado" });
      }

      // Verify hashed code with constant-time comparison
      const isValidCode = await verifyCode(code, user.verificationCode);
      if (!isValidCode) {
        return res.status(400).json({ message: "Código de restablecimiento incorrecto" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);
      
      // Clear code after successful use (single-use)
      await storage.clearVerificationCode(user.id);
      
      res.json({ message: "Contraseña restablecida exitosamente" });
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) return next(sessionErr);
        res.clearCookie('rico.sid');
        res.sendStatus(200);
      });
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
