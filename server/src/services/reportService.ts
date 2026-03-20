import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import type { CreateReportMetadataInput, EnrichReportMetadataInput, UpdateReportStatusInput } from "../types/schemas";

const VALID_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["INVESTIGATING"],
  INVESTIGATING: ["RESPONSE_GIVEN"],
  RESPONSE_GIVEN: ["CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH"],
};

export async function createMetadata(input: CreateReportMetadataInput) {
  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
  const isWb = input.channel === "WHISTLEBLOWING";

  const ackDays = isWb ? org.wbSlaAckDays : org.pdrSlaAckDays;
  const responseDays = isWb ? org.wbSlaResponseDays : org.pdrSlaResponseDays;

  const slaAckDeadline = new Date(receivedAt.getTime() + ackDays * 24 * 60 * 60 * 1000);
  const slaResponseDeadline = new Date(receivedAt.getTime() + responseDays * 24 * 60 * 60 * 1000);

  return prisma.reportMetadata.create({
    data: {
      orgId: input.orgId,
      channel: input.channel,
      receivedAt,
      slaAckDeadline,
      slaResponseDeadline,
    },
  });
}

export async function enrichMetadata(id: string, input: EnrichReportMetadataInput) {
  const report = await prisma.reportMetadata.findUnique({ where: { id } });
  if (!report) throw new AppError(404, "Report not found");

  const updates: Record<string, unknown> = {};

  if (input.category !== undefined) updates.category = input.category;
  if (input.identityRevealed !== undefined) updates.identityRevealed = input.identityRevealed;
  if (input.hasAttachments !== undefined) updates.hasAttachments = input.hasAttachments;

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

  return prisma.reportMetadata.update({
    where: { id },
    data: updates,
  });
}

export async function listMetadata(orgId: string, channel?: string) {
  return prisma.reportMetadata.findMany({
    where: {
      orgId,
      ...(channel && { channel: channel as "PDR125" | "WHISTLEBLOWING" }),
    },
    orderBy: { receivedAt: "desc" },
  });
}

export async function getById(id: string) {
  const report = await prisma.reportMetadata.findUnique({ where: { id } });
  if (!report) throw new AppError(404, "Report not found");
  return report;
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

  return prisma.reportMetadata.update({
    where: { id },
    data: updates,
  });
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
