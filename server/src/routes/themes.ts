import { Router } from "express";
import * as themeController from "../controllers/themeController";
import { authenticate, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createThemeSchema, updateThemeSchema } from "../types/themeSchemas";

const router = Router();

router.get("/themes", authenticate, themeController.listThemes);
router.get("/themes/defaults", authenticate, themeController.getDefaults);
router.get("/themes/:id", authenticate, themeController.getThemeById);
router.post("/themes", authenticate, requirePermission("canEditThemes"), validate(createThemeSchema), themeController.createTheme);
router.put("/themes/:id", authenticate, requirePermission("canEditThemes"), validate(updateThemeSchema), themeController.updateTheme);
router.patch("/themes/:id/config/:section", authenticate, requirePermission("canEditThemes"), themeController.patchThemeSection);
router.post("/themes/:id/clone", authenticate, requirePermission("canEditThemes"), themeController.cloneTheme);
router.delete("/themes/:id", authenticate, requirePermission("canEditThemes"), themeController.deleteTheme);

export default router;
