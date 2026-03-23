import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// List dashboards for an org
router.get("/dashboards", authenticate, dashboardController.list);

// Get dashboard with resolved data
router.get("/dashboards/:id/data", authenticate, dashboardController.getData);

// CRUD — requires RPG, ODV, or Admin
router.post(
  "/dashboards",
  authenticate,
  requireRole("super_admin", "admin", "rpg", "odv"),
  dashboardController.create,
);

router.put(
  "/dashboards/:id",
  authenticate,
  requireRole("super_admin", "admin", "rpg", "odv"),
  dashboardController.update,
);

router.delete(
  "/dashboards/:id",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  dashboardController.remove,
);

// Templates
router.get("/dashboard-templates", authenticate, dashboardController.listTemplates);

router.post(
  "/dashboards/import-template",
  authenticate,
  requireRole("super_admin", "admin", "rpg"),
  dashboardController.importTemplate,
);

export default router;
