import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
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

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// CSRF protection
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
    name: 'rico.sid',
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: false, // DISABLED: No SSL/HTTPS configured - allows cookies over HTTP
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
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
  app.use(['/api/logout'], csrfProtection);

  // Local Strategy (Email/Phone + Password)
  passport.use(
    new LocalStrategy(
      { usernameField: "identifier", passwordField: "password" },
      async (identifier, password, done) => {
        try {
          // Check if identifier is email or phone
          const isEmail = identifier.includes('@');
          
          let user;
          if (isEmail) {
            user = await storage.getUserByEmail(identifier);
          } else {
            user = await storage.getUserByPhone(identifier);
          }
          
          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Email/Teléfono o contraseña incorrectos" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const providerId = profile.id;

          if (!email) {
            return done(new Error('No email from Google'));
          }

          // Check if user exists with this provider ID
          let user = await storage.getUserByProviderId('google', providerId);
          
          if (!user) {
            // Check if email already exists
            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
              // Link OAuth provider to existing account
              user = await storage.updateUserOAuth(existingUser.id, {
                provider: 'google',
                providerId,
                providerEmail: email,
              });
            } else {
              // Create new user
              user = await storage.createOAuthUser({
                email,
                name: profile.displayName || email.split('@')[0],
                provider: 'google',
                providerId,
                providerEmail: email,
              });
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Facebook OAuth Strategy
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID || 'placeholder',
        clientSecret: process.env.FACEBOOK_APP_SECRET || 'placeholder',
        callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const providerId = profile.id;

          if (!email) {
            return done(new Error('No email from Facebook'));
          }

          // Check if user exists with this provider ID
          let user = await storage.getUserByProviderId('facebook', providerId);
          
          if (!user) {
            // Check if email already exists
            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
              // Link OAuth provider to existing account
              user = await storage.updateUserOAuth(existingUser.id, {
                provider: 'facebook',
                providerId,
                providerEmail: email,
              });
            } else {
              // Create new user
              user = await storage.createOAuthUser({
                email,
                name: `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || email.split('@')[0],
                provider: 'facebook',
                providerId,
                providerEmail: email,
              });
            }
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

  // CSRF token endpoint
  app.get("/api/csrf-token", (req: any, res) => {
    res.json({ csrfToken: req.session.csrfToken });
  });

  // Local Email/Password Registration
  app.post("/api/register", async (req, res, next) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email ya está registrado" });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      req.session.regenerate((err: any) => {
        if (err) return next(err);
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.status(201).json({
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            province: user.province,
            role: user.role,
            provider: user.provider,
          });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Datos de registro inválidos" 
        });
      }
      next(error);
    }
  });

  // Local Email/Password Login
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          message: "Email o contraseña incorrectos" 
        });
      }

      req.session.regenerate((sessionErr: any) => {
        if (sessionErr) return next(sessionErr);
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            province: user.province,
            role: user.role,
            provider: user.provider,
          });
        });
      });
    })(req, res, next);
  });

  // Google OAuth Routes
  app.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { 
      failureRedirect: '/auth?error=google_failed',
      successRedirect: '/',
    })
  );

  // Facebook OAuth Routes
  app.get('/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { 
      failureRedirect: '/auth?error=facebook_failed',
      successRedirect: '/',
    })
  );

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
    res.json({
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      phone: req.user!.phone,
      province: req.user!.province,
      role: req.user!.role,
      provider: req.user!.provider,
      hasPhone: !!req.user!.phone, // Flag for frontend
    });
  });
}
