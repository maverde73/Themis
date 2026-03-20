import { Router } from "express";
import * as inviteController from "../controllers/inviteController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createInviteSchema, claimInviteSchema } from "../types/inviteSchemas";

const router = Router();

// Create invite — public during onboarding (org just created, no user yet)
router.post("/invites", validate(createInviteSchema), inviteController.createInvite);

// Get invite info — no auth (mobile app calls this)
router.get("/invites/:token", inviteController.getInvite);

// Claim invite — no auth (mobile app sends public key)
router.post("/invites/:token/claim", validate(claimInviteSchema), inviteController.claimInvite);

// Setup status — public (polled during onboarding before login)
router.get("/organizations/:id/setup-status", inviteController.getSetupStatus);

export default router;
