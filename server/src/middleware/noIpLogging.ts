import { Request, Response, NextFunction } from "express";

/**
 * Middleware for anonymous endpoints (report submission, survey responses).
 * Strips IP-identifying headers to prevent accidental logging of reporter identity.
 */
export function noIpLogging(req: Request, _res: Response, next: NextFunction): void {
  delete req.headers["x-forwarded-for"];
  delete req.headers["x-real-ip"];
  // Override connection remoteAddress to prevent downstream IP logging
  if (req.socket) {
    Object.defineProperty(req.socket, "remoteAddress", { value: "0.0.0.0", writable: false });
  }
  next();
}
