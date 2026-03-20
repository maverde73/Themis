import { Router } from "express";
import * as escrowController from "../controllers/escrowController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createEscrowShareSchema } from "../types/escrowSchemas";

const router = Router();

router.post("/escrow/shares", authenticate, validate(createEscrowShareSchema), escrowController.createShare);
router.get("/escrow/shares", authenticate, escrowController.listShares);
router.delete("/escrow/shares/:id", authenticate, escrowController.deleteShare);

export default router;
