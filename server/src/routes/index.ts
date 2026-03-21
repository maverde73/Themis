import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organizationsRouter from "./organizations";
import reportsRouter from "./reports";
import analyticsRouter from "./analytics";
import surveysRouter from "./surveys";
import escrowRouter from "./escrow";
import invitesRouter from "./invites";
import aiRouter from "./ai";
import themesRouter from "./themes";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(organizationsRouter);
router.use(reportsRouter);
router.use(analyticsRouter);
router.use(surveysRouter);
router.use(escrowRouter);
router.use(invitesRouter);
router.use(aiRouter);
router.use(themesRouter);

export default router;
