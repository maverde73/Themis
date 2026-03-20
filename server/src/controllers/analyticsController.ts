import { Request, Response, NextFunction } from "express";
import * as analyticsService from "../services/analyticsService";

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.params.orgId as string;
    const analytics = await analyticsService.getAnalytics(orgId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}
