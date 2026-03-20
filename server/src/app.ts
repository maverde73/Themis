import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./utils/config";
import { errorHandler } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimiter";
import routes from "./routes";

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "no-referrer" },
}));

// CORS — explicit origins only, never wildcard in production
app.use(cors({
  origin: config.corsOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: "1mb" }));

// Global rate limiter
app.use(globalLimiter);

// Disable X-Powered-By (helmet does this, but belt and suspenders)
app.disable("x-powered-by");

app.use("/api/v1", routes);

app.use(errorHandler);

export default app;
