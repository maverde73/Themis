import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

const uuidPattern = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);

const updatePermissionsSchema = z.object({
  canEditSurveys: z.boolean().optional(),
  canEditThemes: z.boolean().optional(),
  orgRoleId: uuidPattern.optional().nullable(),
});

const approveUserSchema = z.object({
  encryptedLevelKey: z.string().min(1),
});

// GET /users/team — list team members for org
router.get("/users/team", authenticate, requireRole("super_admin", "admin", "rpg"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId;
    if (!orgId) throw new AppError(400, "No organization associated");

    const users = await prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        role: true,
        canEditSurveys: true,
        canEditThemes: true,
        nostrPubkey: true,
        encryptedLevelKey: true,
        approvedAt: true,
        createdAt: true,
        orgRole: { select: { id: true, name: true, slug: true, dataLevel: true, isBuiltin: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id/permissions — update user permissions
router.patch(
  "/users/:id/permissions",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  validate(updatePermissionsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const target = await prisma.user.findUnique({ where: { id: req.params.id as string } });
      if (!target) throw new AppError(404, "User not found");
      if (target.orgId !== req.user!.orgId) throw new AppError(403, "User not in your organization");
      if (target.id === req.user!.userId) throw new AppError(400, "Cannot modify your own permissions");

      const user = await prisma.user.update({
        where: { id: req.params.id as string },
        data: req.body,
        select: {
          id: true,
          email: true,
          role: true,
          canEditSurveys: true,
          canEditThemes: true,
          createdAt: true,
          orgRole: { select: { id: true, name: true, slug: true, dataLevel: true, isBuiltin: true } },
        },
      });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /users/:id/approve — RPG approves user and sends encrypted level key
router.put(
  "/users/:id/approve",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  validate(approveUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const target = await prisma.user.findUnique({ where: { id: req.params.id as string } });
      if (!target) throw new AppError(404, "User not found");
      if (target.orgId !== req.user!.orgId) throw new AppError(403, "User not in your organization");

      const user = await prisma.user.update({
        where: { id: req.params.id as string },
        data: {
          encryptedLevelKey: req.body.encryptedLevelKey,
          approvedAt: new Date(),
          approvedBy: req.user!.userId,
        },
        select: {
          id: true,
          email: true,
          encryptedLevelKey: true,
          approvedAt: true,
          approvedBy: true,
        },
      });
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

const updateKeyBlobSchema = z.object({
  encryptedKeyBlob: z.string().min(1),
  nostrPubkey: z.string().min(1).max(128),
  keyBackupCompleted: z.boolean().optional(),
});

// GET /users/me/key-blob — get own key blob
router.get("/users/me/key-blob", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { encryptedKeyBlob: true, nostrPubkey: true, keyBackupCompleted: true },
    });
    if (!user) throw new AppError(404, "User not found");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /users/me/key-blob — store encrypted key blob + update org public key
router.put("/users/me/key-blob", authenticate, validate(updateKeyBlobSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { encryptedKeyBlob, nostrPubkey, keyBackupCompleted } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Save key blob on user
      const user = await tx.user.update({
        where: { id: req.user!.userId },
        data: {
          encryptedKeyBlob,
          nostrPubkey,
          ...(keyBackupCompleted !== undefined && { keyBackupCompleted }),
        },
        select: { encryptedKeyBlob: true, nostrPubkey: true, keyBackupCompleted: true, role: true, orgId: true },
      });

      // Also save the x25519 public key to the organization based on user role
      if (user.orgId && nostrPubkey) {
        if (user.role === "RPG") {
          await tx.organization.update({
            where: { id: user.orgId },
            data: { rpgPublicKey: nostrPubkey },
          });
        } else if (user.role === "ODV") {
          await tx.organization.update({
            where: { id: user.orgId },
            data: { odvPublicKey: nostrPubkey },
          });
        }
      }

      return { encryptedKeyBlob: user.encryptedKeyBlob, nostrPubkey: user.nostrPubkey, keyBackupCompleted: user.keyBackupCompleted };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /users/me/key-backup — mark backup as completed
router.patch("/users/me/key-backup", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { keyBackupCompleted: true },
    });
    res.json({ keyBackupCompleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
