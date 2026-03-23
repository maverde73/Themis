import { Request, Response, NextFunction } from "express";
import * as inviteService from "../services/inviteService";

export async function createInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const invite = await inviteService.createInvite(req.body, req.user?.userId);
    res.status(201).json(invite);
  } catch (err) {
    next(err);
  }
}

export async function getInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await inviteService.getInvite(req.params.token as string);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function claimInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inviteService.claimInvite(req.params.token as string, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function registerViaInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inviteService.registerViaInvite(req.params.token as string, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSetupStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const status = await inviteService.getSetupStatus(req.params.id as string);
    res.json(status);
  } catch (err) {
    next(err);
  }
}
