import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema, anonTokenRequestSchema } from "../types/schemas";
import { anonymousLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/auth/register", validate(registerSchema), authController.register);
router.post("/auth/login", validate(loginSchema), authController.login);
router.post("/auth/anonymous", anonymousLimiter, validate(anonTokenRequestSchema), authController.anonymousToken);

export default router;
