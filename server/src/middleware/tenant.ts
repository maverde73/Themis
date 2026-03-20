import { Request, Response, NextFunction } from "express";

export function tenantIsolation(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenantId) {
    res.status(403).json({ error: "Tenant context required" });
    return;
  }
  next();
}
