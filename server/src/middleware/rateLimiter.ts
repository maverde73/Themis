import rateLimit from "express-rate-limit";

/**
 * Rate limiter for anonymous/public endpoints only (survey responses, report submission).
 * Protects against abuse on unauthenticated routes.
 */
export const anonymousLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  skip: () => process.env.NODE_ENV === "test",
});
