import { Request, Response, NextFunction } from "express";
import * as escrowService from "../services/escrowService";

export async function createShare(req: Request, res: Response, next: NextFunction) {
  try {
    const share = await escrowService.createShare(req.body);
    res.status(201).json(share);
  } catch (err) {
    next(err);
  }
}

export async function listShares(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.org_id as string;
    const channel = req.query.channel as string | undefined;
    if (!orgId) {
      res.status(400).json({ error: "org_id query parameter required" });
      return;
    }
    const shares = await escrowService.getShares(orgId, channel);
    res.json(shares);
  } catch (err) {
    next(err);
  }
}

export async function deleteShare(req: Request, res: Response, next: NextFunction) {
  try {
    await escrowService.deleteShare(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
