import { Router } from "express";
import * as surveyController from "../controllers/surveyController";
import { authenticate, authenticateAnonymous } from "../middleware/auth";
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

// Survey management — requires auth (RPG/Admin)
router.post("/surveys", authenticate, validate(createSurveySchema), surveyController.createSurvey);
router.get("/surveys", authenticate, surveyController.listSurveys);
router.put("/surveys/:id", authenticate, validate(updateSurveySchema), surveyController.updateSurvey);
router.delete("/surveys/:id", authenticate, surveyController.deleteSurvey);

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

// Get aggregated results — requires auth
router.get("/surveys/:id/results", authenticate, surveyController.getResults);

export default router;
