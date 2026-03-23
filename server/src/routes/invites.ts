import { Router } from "express";
import * as inviteController from "../controllers/inviteController";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createInviteSchema, claimInviteSchema, registerViaInviteSchema } from "../types/inviteSchemas";

const router = Router();

// Create invite — requires auth (super_admin, admin, or rpg)
router.post(
  "/invites",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  validate(createInviteSchema),
  inviteController.createInvite,
);

// Get invite info — no auth (registration page loads this)
router.get("/invites/:token", inviteController.getInvite);

// Claim invite — no auth (mobile app sends public key)
router.post("/invites/:token/claim", validate(claimInviteSchema), inviteController.claimInvite);

// Register via invite — no auth (user registers with email+password)
router.post("/invites/:token/register", validate(registerViaInviteSchema), inviteController.registerViaInvite);

// Setup status — public (polled during onboarding before login)
router.get("/organizations/:id/setup-status", inviteController.getSetupStatus);

export default router;
