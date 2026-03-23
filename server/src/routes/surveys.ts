import { Router } from "express";
import * as surveyController from "../controllers/surveyController";
import { authenticate, authenticateAnonymous, requireRole, requirePermission } from "../middleware/auth";
import { noIpLogging } from "../middleware/noIpLogging";
import { anonymousLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import {
  createSurveySchema,
  updateSurveySchema,
  createSurveyResponseSchema,
} from "../types/surveySchemas";
import { applyThemeSchema } from "../types/themeSchemas";
import * as themeController from "../controllers/themeController";

const router = Router();

// Survey management — requires auth + canEditSurveys
router.post("/surveys", authenticate, requirePermission("canEditSurveys"), validate(createSurveySchema), surveyController.createSurvey);
router.get("/surveys", authenticate, surveyController.listSurveys);
router.put("/surveys/:id", authenticate, requirePermission("canEditSurveys"), validate(updateSurveySchema), surveyController.updateSurvey);
router.delete("/surveys/:id", authenticate, requirePermission("canEditSurveys"), surveyController.deleteSurvey);

// Apply/remove theme from survey
router.put("/surveys/:id/theme", authenticate, validate(applyThemeSchema), themeController.applyThemeToSurvey);

// Mobile endpoints — require anonymous or user token
router.get("/surveys/active", authenticateAnonymous, surveyController.listActiveSurveys);
router.get("/surveys/:id", authenticateAnonymous, surveyController.getSurveyById);

// Submit response — anonymous token + no IP logging + rate limited
router.post(
  "/surveys/:id/responses",
  authenticateAnonymous,
  anonymousLimiter,
  noIpLogging,
  validate(createSurveyResponseSchema),
  surveyController.submitResponse,
);

// Get aggregated results — requires auth (excludes TECHNICAL)
router.get("/surveys/:id/results", authenticate, requireRole("super_admin", "admin", "rpg", "odv"), surveyController.getResults);
router.get("/surveys/:id/results/export", authenticate, requireRole("super_admin", "admin", "rpg", "odv"), surveyController.exportResultsPdf);

// ── Public routes (no auth) ──────────────────────────────────────────
// Get a published survey by id — only returns ACTIVE surveys
router.get("/public/surveys/:id", surveyController.getPublicSurvey);

// Get Nostr submission config for a public survey
router.get("/public/surveys/:id/nostr-config", surveyController.getNostrConfig);

// Submit response to a public survey — rate limited, no IP logging
router.post(
  "/public/surveys/:id/responses",
  anonymousLimiter,
  noIpLogging,
  validate(createSurveyResponseSchema),
  surveyController.submitPublicResponse,
);

export default router;
