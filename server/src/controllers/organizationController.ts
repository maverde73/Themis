import { Request, Response, NextFunction } from "express";
import * as organizationService from "../services/organizationService";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const org = await organizationService.create(req.body);
    res.status(201).json(org);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const org = await organizationService.getById(req.params.id as string);
    res.json(org);
  } catch (err) {
    next(err);
  }
}

export async function updateKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const org = await organizationService.updateKeys(req.params.id as string, req.body);
    res.json(org);
  } catch (err) {
    next(err);
  }
}

export async function generatePairingQr(req: Request, res: Response, next: NextFunction) {
  try {
    const qrData = await organizationService.generatePairingQr(req.params.id as string);
    res.json(qrData);
  } catch (err) {
    next(err);
  }
}
