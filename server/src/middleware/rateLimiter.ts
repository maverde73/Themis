import rateLimit from "express-rate-limit";

/**
 * Rate limiter for anonymous endpoints (report submission, survey responses).
 * Stricter than the global limiter since these don't require auth.
 */
export const anonymousLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  // Skip in test environment
  skip: () => process.env.NODE_ENV === "test",
});

/**
 * Global rate limiter for authenticated endpoints.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  skip: () => process.env.NODE_ENV === "test",
});
