import { Router } from "express";
import * as orgController from "../controllers/organizationController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createOrganizationSchema, updateKeysSchema } from "../types/schemas";

const router = Router();

router.post("/organizations", authenticate, validate(createOrganizationSchema), orgController.create);
router.get("/organizations/:id", authenticate, orgController.getById);
router.put("/organizations/:id/keys", authenticate, validate(updateKeysSchema), orgController.updateKeys);
router.post("/organizations/:id/pairing-qr", authenticate, orgController.generatePairingQr);

export default router;
