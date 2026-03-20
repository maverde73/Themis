import { Router } from "express";
import * as inviteController from "../controllers/inviteController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createInviteSchema, claimInviteSchema } from "../types/inviteSchemas";

const router = Router();

// Create invite — requires auth (admin/RPG)
router.post("/invites", authenticate, validate(createInviteSchema), inviteController.createInvite);

// Get invite info — no auth (mobile app calls this)
router.get("/invites/:token", inviteController.getInvite);

// Claim invite — no auth (mobile app sends public key)
router.post("/invites/:token/claim", validate(claimInviteSchema), inviteController.claimInvite);

// Setup status — requires auth
router.get("/organizations/:id/setup-status", authenticate, inviteController.getSetupStatus);

export default router;
