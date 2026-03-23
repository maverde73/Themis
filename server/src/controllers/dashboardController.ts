import { Request, Response, NextFunction } from "express";
import * as dashboardService from "../services/dashboardService";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.org_id as string;
    if (!orgId) {
      res.status(400).json({ error: "org_id query parameter required" });
      return;
    }
    const surveyId = req.query.survey_id as string | undefined;
    const channel = req.query.channel as string | undefined;
    const dashboards = await dashboardService.listDashboards(orgId, surveyId, channel);
    res.json(dashboards);
  } catch (err) {
    next(err);
  }
}

export async function getData(req: Request, res: Response, next: NextFunction) {
  try {
    // Access level defaults to 1; can be elevated based on user role
    const accessLevel = Number(req.query.access_level) || 1;
    const result = await dashboardService.getDashboardWithData(req.params.id as string, accessLevel);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dashboard = await dashboardService.createDashboard(req.body);
    res.status(201).json(dashboard);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dashboard = await dashboardService.updateDashboard(req.params.id as string, req.body);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await dashboardService.deleteDashboard(req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listTemplates(_req: Request, res: Response, next: NextFunction) {
  try {
    const templates = await dashboardService.listTemplates();
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

export async function importTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, templateId } = req.body;
    if (!orgId || !templateId) {
      res.status(400).json({ error: "orgId and templateId are required" });
      return;
    }
    const dashboard = await dashboardService.importTemplate(orgId, templateId);
    res.status(201).json(dashboard);
  } catch (err) {
    next(err);
  }
}
