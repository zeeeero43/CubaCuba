import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedModerationSystem } from "./seed-moderation";
import { seedPremiumFeatures } from "./seed-premium";

const app = express();

// Trust proxy for rate limiting and secure cookies
app.set("trust proxy", 1);

// Gzip/Brotli compression for ALL responses (saves 60-70% bandwidth)
app.use(compression({
  level: 6, // Compression level (0-9, 6 is good balance)
  threshold: 1024, // Only compress if > 1KB
  filter: (req: Request, res: Response) => {
    // Always compress unless explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // needed for Vite in dev
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // WebSockets for Vite HMR
    },
    ...(process.env.NODE_ENV === "development" && {
      reportOnly: true // Less strict in development
    })
  },
  hsts: process.env.NODE_ENV === "production" ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { message: "Demasiadas solicitudes, intenta de nuevo más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication endpoints rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit auth attempts
  message: { message: "Demasiados intentos de autenticación, intenta de nuevo más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for GET requests (public browsing)
    return req.method === 'GET';
  }
});

// Progressive delay for auth endpoints
const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 3, // Allow 3 requests per windowMs without delay
  delayMs: () => 500, // Fixed delay function format
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  skip: (req) => req.method === 'GET'
});

app.use(globalLimiter);

// Body parsing with size limits (50mb for image uploads as base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Apply auth rate limiting to authentication endpoints
app.use('/api/login', authLimiter, authSlowDown);
app.use('/api/register', authLimiter, authSlowDown);
app.use('/api/verify-sms', authLimiter, authSlowDown);
app.use('/api/resend-verification', authLimiter, authSlowDown);
app.use('/api/reset-password', authLimiter, authSlowDown);
app.use('/api/confirm-reset', authLimiter, authSlowDown);

// Disable browser caching completely (always show latest version)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // SECURITY: Never log response bodies for auth endpoints to prevent leaking sensitive data
      const isAuthEndpoint = path.includes('/login') || path.includes('/register') || 
                            path.includes('/verify') || path.includes('/reset') || 
                            path.includes('/user');
      
      if (capturedJsonResponse && !isAuthEndpoint) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await seedModerationSystem().catch(err => {
    console.error("❌ Error seeding moderation system:", err);
  });

  await seedPremiumFeatures().catch(err => {
    console.error("❌ Error seeding premium features:", err);
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
