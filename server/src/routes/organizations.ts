import { Router, Request, Response, NextFunction } from "express";
import * as orgController from "../controllers/organizationController";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createOrganizationSchema, updateKeysSchema } from "../types/schemas";
import { importTemplateSchema } from "../types/surveySchemas";
import { importTemplates, listTemplates } from "../services/templateService";
import { prisma } from "../utils/prisma";
import { z } from "zod";

const router = Router();

// Public — onboarding creates org before any user exists
router.post("/organizations", validate(createOrganizationSchema), orgController.create);
router.get("/organizations/:id", authenticate, orgController.getById);
router.put("/organizations/:id/keys", authenticate, validate(updateKeysSchema), orgController.updateKeys);
router.post("/organizations/:id/pairing-qr", authenticate, orgController.generatePairingQr);

// PUT /organizations/:id/level-pubkeys — save level public keys (RPG only)
const levelPubKeysSchema = z.object({
  levelPubKeys: z.record(z.string(), z.string().nullable()),
});

router.put(
  "/organizations/:id/level-pubkeys",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  validate(levelPubKeysSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.organization.update({
        where: { id: req.params.id as string },
        data: { levelPubKeys: req.body.levelPubKeys },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// List available templates (no auth needed — catalog is public)
router.get("/templates", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listTemplates());
  } catch (err) {
    next(err);
  }
});

// Import predefined form templates
router.post(
  "/organizations/:id/import-template",
  authenticate,
  validate(importTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.params.id as string;
      const { templateId } = req.body;
      const ids = Array.isArray(templateId) ? templateId : [templateId];
      const results = await importTemplates(orgId, ids);
      res.status(201).json(results);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
