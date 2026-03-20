import { Router } from "express";
import * as analyticsController from "../controllers/analyticsController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/analytics/:orgId", authenticate, analyticsController.getAnalytics);

export default router;
