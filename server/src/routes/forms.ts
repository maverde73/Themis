import { Router, Request, Response, NextFunction } from "express";
import { generateFormHtml } from "../services/htmlFormGenerator";

const router = Router();

// GET /forms/:surveyId — returns self-contained HTML form (no auth, only ACTIVE surveys)
router.get("/forms/:surveyId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const html = await generateFormHtml(req.params.surveyId as string);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(html);
  } catch (err) {
    next(err);
  }
});

export default router;
