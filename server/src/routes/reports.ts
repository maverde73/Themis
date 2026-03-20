import { Router } from "express";
import * as reportController from "../controllers/reportController";
import { authenticate } from "../middleware/auth";
import { noIpLogging } from "../middleware/noIpLogging";
import { anonymousLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import { createReportMetadataSchema, enrichReportMetadataSchema, updateReportStatusSchema } from "../types/schemas";

const router = Router();

// Anonymous endpoint — no auth, no IP logging, rate limited
router.post("/reports/metadata", anonymousLimiter, noIpLogging, validate(createReportMetadataSchema), reportController.createMetadata);

// Dashboard endpoints require auth
router.get("/reports/metadata", authenticate, reportController.listMetadata);
router.get("/reports/metadata/:id", authenticate, reportController.getById);
router.put("/reports/metadata/:id", authenticate, validate(enrichReportMetadataSchema), reportController.enrichMetadata);
router.put("/reports/metadata/:id/status", authenticate, validate(updateReportStatusSchema), reportController.updateStatus);
router.get("/reports/sla-status", authenticate, reportController.getSlaStatus);

export default router;
