import { Request, Response, NextFunction } from "express";
import * as themeService from "../services/themeService";

export async function listThemes(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.org_id as string | undefined;
    if (!orgId) {
      res.status(400).json({ error: "org_id query parameter required" });
      return;
    }
    const result = await themeService.listThemes(orgId, {
      includeBuiltin: req.query.include_builtin !== "false",
      includePublic: req.query.include_public !== "false",
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDefaults(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(themeService.getDefaultConfig());
  } catch (err) {
    next(err);
  }
}

export async function getThemeById(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await themeService.getThemeById(req.params.id as string);
    res.json(theme);
  } catch (err) {
    next(err);
  }
}

export async function createTheme(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await themeService.createTheme(req.body, req.user!.userId, req.user!.orgId);
    res.status(201).json(theme);
  } catch (err) {
    next(err);
  }
}

export async function updateTheme(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await themeService.updateTheme(req.params.id as string, req.body, req.user!.userId);
    res.json(theme);
  } catch (err) {
    next(err);
  }
}

export async function patchThemeSection(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await themeService.patchThemeSection(
      req.params.id as string,
      req.params.section as string,
      req.body,
      req.user!.userId,
    );
    res.json(theme);
  } catch (err) {
    next(err);
  }
}

export async function cloneTheme(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await themeService.cloneTheme(
      req.params.id as string,
      req.user!.userId,
      req.user!.orgId,
      req.body.name,
    );
    res.status(201).json(theme);
  } catch (err) {
    next(err);
  }
}

export async function deleteTheme(req: Request, res: Response, next: NextFunction) {
  try {
    await themeService.deleteTheme(req.params.id as string, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function applyThemeToSurvey(req: Request, res: Response, next: NextFunction) {
  try {
    const survey = await themeService.applyThemeToSurvey(req.params.id as string, req.body.themeId);
    res.json(survey);
  } catch (err) {
    next(err);
  }
}
