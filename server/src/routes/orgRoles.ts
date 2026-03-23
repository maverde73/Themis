import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";

const router = Router();

const uuidPattern = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);

const createOrgRoleSchema = z.object({
  orgId: uuidPattern,
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().max(500).optional(),
  dataLevel: z.number().int().min(0).max(5),
});

const updateOrgRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  dataLevel: z.number().int().min(0).max(5).optional(),
});

// GET /org-roles?org_id=
router.get(
  "/org-roles",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.query.org_id as string;
      if (!orgId) {
        res.status(400).json({ error: "org_id query parameter required" });
        return;
      }
      const roles = await prisma.orgRole.findMany({
        where: { orgId },
        orderBy: { dataLevel: "asc" },
        include: { _count: { select: { users: true } } },
      });
      res.json(roles);
    } catch (err) {
      next(err);
    }
  },
);

// POST /org-roles
router.post(
  "/org-roles",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  validate(createOrgRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId, name, slug, dataLevel } = req.body;
      const role = await prisma.orgRole.create({
        data: { orgId, name, slug, dataLevel },
      });
      res.status(201).json(role);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /org-roles/:id
router.put(
  "/org-roles/:id",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  validate(updateOrgRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = await prisma.orgRole.findUnique({ where: { id } });
      if (!existing) throw new AppError(404, "OrgRole not found");
      if (existing.isBuiltin) throw new AppError(403, "Cannot modify builtin roles");

      const role = await prisma.orgRole.update({
        where: { id },
        data: req.body,
      });
      res.json(role);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /org-roles/:id
router.delete(
  "/org-roles/:id",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const existing = await prisma.orgRole.findUnique({
        where: { id },
        include: { _count: { select: { users: true } } },
      });
      if (!existing) throw new AppError(404, "OrgRole not found");
      if (existing.isBuiltin) throw new AppError(403, "Cannot delete builtin roles");
      if (existing._count.users > 0) throw new AppError(400, "Cannot delete role with assigned users");

      await prisma.orgRole.delete({ where: { id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
