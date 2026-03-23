import { Router } from "express";
import * as analyticsController from "../controllers/analyticsController";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.get("/analytics/:orgId", authenticate, requireRole("super_admin", "admin", "rpg", "odv"), analyticsController.getAnalytics);

export default router;
