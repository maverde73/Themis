import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { createOrganizationSchema } from "../types/schemas";
import * as orgService from "../services/organizationService";

export async function listOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
        _count: { select: { users: true, surveys: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orgs);
  } catch (err) {
    next(err);
  }
}

export async function createOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOrganizationSchema.parse(req.body);
    const org = await orgService.create(input);
    res.status(201).json(org);
  } catch (err) {
    next(err);
  }
}

export async function getOrganizationDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id as string },
      include: {
        users: {
          select: { id: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { surveys: true, reportMetadata: true } },
      },
    });
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }
    res.json(org);
  } catch (err) {
    next(err);
  }
}
