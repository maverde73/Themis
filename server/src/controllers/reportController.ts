import { Request, Response, NextFunction } from "express";
import * as reportService from "../services/reportService";
import * as pdfService from "../services/pdfService";
import { listReportMetadataQuerySchema, exportRegistroQuerySchema } from "../types/schemas";

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
    const parsed = listReportMetadataQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
      return;
    }
    const result = await reportService.listMetadata(parsed.data);
    res.json(result);
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

export async function exportRegistro(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = exportRegistroQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
      return;
    }

    if (parsed.data.format === "json") {
      const data = await pdfService.generateRegistroJson(parsed.data);
      res.json(data);
      return;
    }

    const buffer = await pdfService.generateRegistroPdf(parsed.data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="registro-segnalazioni.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function exportSchedaDati(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.query.org_id as string;
    if (!orgId) {
      res.status(400).json({ error: "org_id query parameter required" });
      return;
    }
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const format = (req.query.format as string) || "pdf";

    if (format === "json") {
      const data = await pdfService.generateSchedaDati(orgId, from, to);
      res.json(data);
      return;
    }

    const buffer = await pdfService.generateSchedaDatiPdf(orgId, from, to);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="scheda-dati-riesame.pdf"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
