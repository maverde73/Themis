import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import organizationsRouter from "./organizations";
import reportsRouter from "./reports";
import analyticsRouter from "./analytics";
import surveysRouter from "./surveys";
import escrowRouter from "./escrow";
import invitesRouter from "./invites";
import aiRouter from "./ai";
import themesRouter from "./themes";
import formsRouter from "./forms";
import usersRouter from "./users";
import orgRolesRouter from "./orgRoles";
import nostrEventsRouter from "./nostrEvents";
import dashboardsRouter from "./dashboards";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(organizationsRouter);
router.use(reportsRouter);
router.use(analyticsRouter);
router.use(surveysRouter);
router.use(escrowRouter);
router.use(invitesRouter);
router.use(aiRouter);
router.use(themesRouter);
router.use(formsRouter);
router.use(usersRouter);
router.use(orgRolesRouter);
router.use(nostrEventsRouter);
router.use(dashboardsRouter);

export default router;
