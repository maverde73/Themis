import { Request, Response, NextFunction } from "express";
import * as surveyService from "../services/surveyService";
import { getAggregatedResults } from "../services/surveyAggregation";

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
    const survey = await surveyService.updateSurvey(req.params.id as string, req.body);
    res.json(survey);
  } catch (err) {
    next(err);
  }
}

export async function deleteSurvey(req: Request, res: Response, next: NextFunction) {
  try {
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
