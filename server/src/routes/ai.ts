import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import { surveyAssistant, uploadPdf } from "../controllers/aiController";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

router.post(
  "/ai/survey-assistant",
  authenticate,
  surveyAssistant,
);

router.post(
  "/ai/upload-pdf",
  authenticate,
  upload.single("file"),
  uploadPdf,
);

export default router;
