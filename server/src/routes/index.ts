import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organizationsRouter from "./organizations";
import reportsRouter from "./reports";
import analyticsRouter from "./analytics";
import surveysRouter from "./surveys";
import escrowRouter from "./escrow";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(organizationsRouter);
router.use(reportsRouter);
router.use(analyticsRouter);
router.use(surveysRouter);
router.use(escrowRouter);

export default router;
