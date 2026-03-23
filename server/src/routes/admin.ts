import { Router } from "express";
import { authenticate, requireSuperAdmin } from "../middleware/auth";
import * as adminController from "../controllers/adminController";

const router = Router();

router.use("/admin", authenticate, requireSuperAdmin);

router.get("/admin/organizations", adminController.listOrganizations);
router.post("/admin/organizations", adminController.createOrganization);
router.get("/admin/organizations/:id", adminController.getOrganizationDetail);

export default router;
