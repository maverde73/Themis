import { Router } from "express";
import * as surveyController from "../controllers/surveyController";
import { authenticate } from "../middleware/auth";
import { noIpLogging } from "../middleware/noIpLogging";
import { anonymousLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import {
  createSurveySchema,
  updateSurveySchema,
  createSurveyResponseSchema,
} from "../types/surveySchemas";

const router = Router();

// Survey management — requires auth (RPG/Admin)
router.post("/surveys", authenticate, validate(createSurveySchema), surveyController.createSurvey);
router.get("/surveys", authenticate, surveyController.listSurveys);
router.put("/surveys/:id", authenticate, validate(updateSurveySchema), surveyController.updateSurvey);
router.delete("/surveys/:id", authenticate, surveyController.deleteSurvey);

// Get survey schema — no auth needed for the mobile app to fetch active surveys
router.get("/surveys/:id", surveyController.getSurveyById);

// Submit response — anonymous, no auth, no IP logging, rate limited
router.post(
  "/surveys/:id/responses",
  anonymousLimiter,
  noIpLogging,
  validate(createSurveyResponseSchema),
  surveyController.submitResponse,
);

// Get aggregated results — requires auth
router.get("/surveys/:id/results", authenticate, surveyController.getResults);

export default router;
