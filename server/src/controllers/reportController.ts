import { Request, Response, NextFunction } from "express";
import * as reportService from "../services/reportService";

export async function createMetadata(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.createMetadata(req.body);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

export async function listMetadata(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.org_id as string;
    const channel = req.query.channel as string | undefined;
    if (!orgId) {
      res.status(400).json({ error: "org_id query parameter required" });
      return;
    }
    const reports = await reportService.listMetadata(orgId, channel);
    res.json(reports);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.getById(req.params.id as string);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function enrichMetadata(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.enrichMetadata(req.params.id as string, req.body);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.updateStatus(req.params.id as string, req.body);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function getSlaStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.org_id as string;
    if (!orgId) {
      res.status(400).json({ error: "org_id query parameter required" });
      return;
    }
    const status = await reportService.getSlaStatus(orgId);
    res.json(status);
  } catch (err) {
    next(err);
  }
}
