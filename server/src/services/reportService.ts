import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import { appendAuditLog } from "./auditService";
import type { CreateReportMetadataInput, EnrichReportMetadataInput, UpdateReportStatusInput, ListReportMetadataQuery } from "../types/schemas";

const VALID_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["INVESTIGATING"],
  INVESTIGATING: ["RESPONSE_GIVEN"],
  RESPONSE_GIVEN: ["CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH"],
};

export async function createMetadata(input: CreateReportMetadataInput) {
  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  // receivedAt is always server-generated — never trust client input
  const receivedAt = new Date();
  const isWb = input.channel === "WHISTLEBLOWING";

  const ackDays = isWb ? org.wbSlaAckDays : org.pdrSlaAckDays;
  const responseDays = isWb ? org.wbSlaResponseDays : org.pdrSlaResponseDays;

  const slaAckDeadline = new Date(receivedAt.getTime() + ackDays * 24 * 60 * 60 * 1000);
  const slaResponseDeadline = new Date(receivedAt.getTime() + responseDays * 24 * 60 * 60 * 1000);

  const report = await prisma.reportMetadata.create({
    data: {
      orgId: input.orgId,
      channel: input.channel,
      receivedAt,
      slaAckDeadline,
      slaResponseDeadline,
    },
  });

  await appendAuditLog("ReportMetadata", report.id, "CREATE", {
    orgId: input.orgId,
    channel: input.channel,
    receivedAt: receivedAt.toISOString(),
  });

  return report;
}

export async function enrichMetadata(id: string, input: EnrichReportMetadataInput) {
  const report = await prisma.reportMetadata.findUnique({ where: { id } });
  if (!report) throw new AppError(404, "Report not found");

  const updates: Record<string, unknown> = {};

  if (input.category !== undefined) updates.category = input.category;
  if (input.identityRevealed !== undefined) updates.identityRevealed = input.identityRevealed;
  if (input.hasAttachments !== undefined) updates.hasAttachments = input.hasAttachments;
  if (input.correctiveAction !== undefined) updates.correctiveAction = input.correctiveAction;

  if (input.status !== undefined) {
    const allowed = VALID_TRANSITIONS[report.status];
    if (!allowed || !allowed.includes(input.status)) {
      throw new AppError(400, `Invalid transition from ${report.status} to ${input.status}`);
    }
    updates.status = input.status;

    const now = new Date();
    if (input.status === "ACKNOWLEDGED") {
      updates.acknowledgedAt = now;
      updates.slaAckMet = now <= (report.slaAckDeadline ?? now);
    } else if (input.status === "RESPONSE_GIVEN") {
      updates.responseGivenAt = now;
      updates.slaResponseMet = now <= (report.slaResponseDeadline ?? now);
    } else if (input.status.startsWith("CLOSED_")) {
      updates.closedAt = now;
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(400, "No valid fields to update");
  }

  const updated = await prisma.reportMetadata.update({
    where: { id },
    data: updates,
  });

  const action = updates.status ? "STATUS_CHANGE" : "ENRICH";
  const auditData: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    ...updates,
  };
  if (updates.status) {
    auditData.from = report.status;
    auditData.to = updates.status;
  }
  await appendAuditLog("ReportMetadata", id, action, auditData);

  return updated;
}

export async function listMetadata(query: ListReportMetadataQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { orgId: query.org_id };
  if (query.channel) where.channel = query.channel;
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.date_from || query.date_to) {
    where.receivedAt = {
      ...(query.date_from && { gte: new Date(query.date_from) }),
      ...(query.date_to && { lte: new Date(query.date_to) }),
    };
  }

  const orderBy = { [query.sort_by ?? "receivedAt"]: query.sort_dir ?? "desc" };

  const [items, total] = await Promise.all([
    prisma.reportMetadata.findMany({ where, orderBy, skip, take: limit }),
    prisma.reportMetadata.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function getById(id: string) {
  const report = await prisma.reportMetadata.findUnique({ where: { id } });
  if (!report) throw new AppError(404, "Report not found");

  const now = new Date();

  let slaAckDaysRemaining: number | null = null;
  let slaAckOverdue = false;
  if (report.slaAckDeadline) {
    slaAckDaysRemaining = Math.ceil((report.slaAckDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    slaAckOverdue = report.status === "RECEIVED" && now > report.slaAckDeadline;
  }

  let slaResponseDaysRemaining: number | null = null;
  let slaResponseOverdue = false;
  if (report.slaResponseDeadline) {
    slaResponseDaysRemaining = Math.ceil((report.slaResponseDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    slaResponseOverdue = !["RECEIVED", "CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH"].includes(report.status)
      && now > report.slaResponseDeadline;
  }

  const validNextStatuses = VALID_TRANSITIONS[report.status] ?? [];

  return {
    ...report,
    slaAckDaysRemaining,
    slaAckOverdue,
    slaResponseDaysRemaining,
    slaResponseOverdue,
    validNextStatuses,
  };
}

export async function updateStatus(id: string, input: UpdateReportStatusInput) {
  const report = await prisma.reportMetadata.findUnique({ where: { id } });
  if (!report) throw new AppError(404, "Report not found");

  const allowed = VALID_TRANSITIONS[report.status];
  if (!allowed || !allowed.includes(input.status)) {
    throw new AppError(400, `Invalid transition from ${report.status} to ${input.status}`);
  }

  const now = new Date();
  const updates: Record<string, unknown> = { status: input.status };

  if (input.status === "ACKNOWLEDGED") {
    updates.acknowledgedAt = now;
    updates.slaAckMet = now <= (report.slaAckDeadline ?? now);
  } else if (input.status === "RESPONSE_GIVEN") {
    updates.responseGivenAt = now;
    updates.slaResponseMet = now <= (report.slaResponseDeadline ?? now);
  } else if (input.status.startsWith("CLOSED_")) {
    updates.closedAt = now;
  }

  const updated = await prisma.reportMetadata.update({
    where: { id },
    data: updates,
  });

  await appendAuditLog("ReportMetadata", id, "STATUS_CHANGE", {
    from: report.status,
    to: input.status,
    timestamp: now.toISOString(),
    ...updates,
  });

  return updated;
}

export async function getSlaStatus(orgId: string) {
  const now = new Date();
  const reports = await prisma.reportMetadata.findMany({
    where: {
      orgId,
      status: { notIn: ["CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH"] },
    },
  });

  return reports.map((r) => {
    const ackOverdue = r.status === "RECEIVED" && r.slaAckDeadline && now > r.slaAckDeadline;
    const responseOverdue = !["RECEIVED"].includes(r.status) &&
      r.slaResponseDeadline && now > r.slaResponseDeadline;

    let ackDaysRemaining: number | null = null;
    if (r.status === "RECEIVED" && r.slaAckDeadline) {
      ackDaysRemaining = Math.ceil((r.slaAckDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    }

    let responseDaysRemaining: number | null = null;
    if (r.slaResponseDeadline) {
      responseDaysRemaining = Math.ceil((r.slaResponseDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    }

    return {
      id: r.id,
      channel: r.channel,
      status: r.status,
      ackOverdue,
      responseOverdue,
      ackDaysRemaining,
      responseDaysRemaining,
    };
  });
}
