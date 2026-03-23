import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function anonymousToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = await authService.generateAnonymousToken(req.body);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}
