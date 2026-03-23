import { Request, Response, NextFunction } from "express";
import * as surveyService from "../services/surveyService";
import { getAggregatedResults } from "../services/surveyAggregation";
import { generateSurveyResultsPdf } from "../services/pdfService";
import { config } from "../utils/config";
import { getSecp256k1Pubkey, getX25519Pubkey } from "../utils/nostrKeys";

export async function createSurvey(req: Request, res: Response, next: NextFunction) {
  try {
    const survey = await surveyService.createSurvey(req.body);
    res.status(201).json(survey);
  } catch (err) {
    next(err);
  }
}

export async function listSurveys(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.org_id as string | undefined;
    const status = req.query.status as string | undefined;
    if (!orgId) {
      res.status(400).json({ error: "org_id query parameter required" });
      return;
    }
    const surveys = await surveyService.listSurveys(orgId, status);
    res.json(surveys);
  } catch (err) {
    next(err);
  }
}

export async function listActiveSurveys(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.org_id as string | undefined;
    if (!orgId) {
      res.status(400).json({ error: "org_id query parameter required" });
      return;
    }
    const surveys = await surveyService.listSurveys(orgId, "ACTIVE");
    res.json(surveys);
  } catch (err) {
    next(err);
  }
}

export async function getSurveyById(req: Request, res: Response, next: NextFunction) {
  try {
    const survey = await surveyService.getSurveyById(req.params.id as string);
    res.json(survey);
  } catch (err) {
    next(err);
  }
}

export async function updateSurvey(req: Request, res: Response, next: NextFunction) {
  try {
    // TECHNICAL users cannot modify published surveys or change status to ACTIVE
    if (req.user?.role === "technical") {
      const existing = await surveyService.getSurveyById(req.params.id as string);
      if (["ACTIVE", "CLOSED", "ARCHIVED"].includes(existing.status)) {
        res.status(403).json({ error: "Technical users cannot modify published surveys" });
        return;
      }
      if (req.body.status && req.body.status !== "DRAFT") {
        res.status(403).json({ error: "Technical users cannot publish surveys" });
        return;
      }
    }
    const survey = await surveyService.updateSurvey(req.params.id as string, req.body);
    res.json(survey);
  } catch (err) {
    next(err);
  }
}

export async function deleteSurvey(req: Request, res: Response, next: NextFunction) {
  try {
    // TECHNICAL users cannot delete active surveys
    if (req.user?.role === "technical") {
      const existing = await surveyService.getSurveyById(req.params.id as string);
      if (existing.status === "ACTIVE") {
        res.status(403).json({ error: "Technical users cannot delete active surveys" });
        return;
      }
    }
    const survey = await surveyService.deleteSurvey(req.params.id as string);
    res.json(survey);
  } catch (err) {
    next(err);
  }
}

export async function submitResponse(req: Request, res: Response, next: NextFunction) {
  try {
    const response = await surveyService.submitResponse(req.params.id as string, req.body);
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getResults(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await getAggregatedResults(req.params.id as string);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function exportResultsPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await getAggregatedResults(req.params.id as string);
    const buffer = await generateSurveyResultsPdf(results);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="survey-results-${req.params.id.slice(0, 8)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function getPublicSurvey(req: Request, res: Response, next: NextFunction) {
  try {
    const survey = await surveyService.getPublicSurvey(req.params.id as string);
    res.json(survey);
  } catch (err) {
    next(err);
  }
}

export async function submitPublicResponse(req: Request, res: Response, next: NextFunction) {
  try {
    const response = await surveyService.submitPublicResponse(req.params.id as string, req.body);
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
}

export async function getNostrConfig(req: Request, res: Response, next: NextFunction) {
  try {
    // Look up the survey to find its org and channel, then return the correct recipient pubkey
    const survey = await surveyService.getSurveyById(req.params.id as string);

    let recipientPubKey: string | null = null;
    let levelPubKeys: Record<string, string | null> | null = null;

    if (survey.orgId) {
      const { prisma } = await import("../utils/prisma");
      const org = await prisma.organization.findUnique({
        where: { id: survey.orgId },
        select: { rpgPublicKey: true, odvPublicKey: true, levelPubKeys: true },
      });
      if (org) {
        // Route to the correct recipient based on survey channel
        recipientPubKey = survey.channel === "WHISTLEBLOWING"
          ? org.odvPublicKey
          : org.rpgPublicKey;

        // Include level pub keys for per-field encryption
        if (org.levelPubKeys && typeof org.levelPubKeys === "object") {
          levelPubKeys = org.levelPubKeys as Record<string, string | null>;
        }
      }
    }

    res.json({
      relayUrls: config.relayUrls,
      serverPubKey: getSecp256k1Pubkey(),
      serverX25519PubKey: getX25519Pubkey(),
      powDifficulty: config.nostrPowDifficulty,
      recipientPubKey,
      levelPubKeys,
    });
  } catch (err) {
    next(err);
  }
}
