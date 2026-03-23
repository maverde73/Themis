import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../utils/config";
import type { JwtPayload, AnonJwtPayload } from "../types";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = payload;
    // SUPER_ADMIN has no org — tenantId stays undefined
    if (payload.orgId) {
      req.tenantId = payload.orgId;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Accepts both user JWTs and anonymous JWTs.
 * For anonymous tokens: sets req.tenantId but NOT req.user.
 * For user tokens: sets both req.user and req.tenantId.
 */
export function authenticateAnonymous(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload | AnonJwtPayload;
    if ("type" in payload && payload.type === "anonymous") {
      req.tenantId = payload.orgId;
    } else {
      const userPayload = payload as JwtPayload;
      req.user = userPayload;
      if (userPayload.orgId) {
        req.tenantId = userPayload.orgId;
      }
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: JwtPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "super_admin") {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  next();
}

/**
 * Checks a boolean permission field on the User record.
 * RPG, ADMIN, SUPER_ADMIN bypass automatically.
 */
export function requirePermission(field: "canEditSurveys" | "canEditThemes") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Privileged roles bypass permission checks
    const bypassRoles: JwtPayload["role"][] = ["rpg", "admin", "super_admin"];
    if (bypassRoles.includes(req.user.role)) {
      next();
      return;
    }

    try {
      const { prisma } = await import("../utils/prisma");
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { canEditSurveys: true, canEditThemes: true },
      });
      if (!user || !user[field]) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      next();
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
