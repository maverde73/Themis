import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import { appendAuditLog } from "./auditService";
import type {
  CreateSurveyInput,
  UpdateSurveyInput,
  CreateSurveyResponseInput,
  SurveySchemaDefinition,
} from "../types/surveySchemas";

export async function createSurvey(input: CreateSurveyInput) {
  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  return prisma.survey.create({
    data: {
      orgId: input.orgId,
      title: input.title,
      description: input.description ?? null,
      schema: JSON.parse(JSON.stringify(input.schema)),
      version: 1,
      status: "DRAFT",
      channel: input.channel ?? null,
      icon: input.icon ?? null,
      themeId: input.themeId ?? null,
    },
    include: { theme: { select: { id: true, name: true, config: true } } },
  });
}

export async function listSurveys(orgId: string, status?: string) {
  return prisma.survey.findMany({
    where: {
      orgId,
      status: status
        ? (status as "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED")
        : { not: "ARCHIVED" },
    },
    orderBy: { createdAt: "desc" },
    include: { theme: { select: { id: true, name: true, config: true } } },
  });
}

export async function getSurveyById(id: string) {
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: { theme: { select: { id: true, name: true, config: true } } },
  });
  if (!survey) throw new AppError(404, "Survey not found");
  return survey;
}

export async function updateSurvey(id: string, input: UpdateSurveyInput) {
  const survey = await prisma.survey.findUnique({ where: { id } });
  if (!survey) throw new AppError(404, "Survey not found");

  if (survey.status === "ARCHIVED") {
    throw new AppError(400, "Cannot update an archived survey");
  }

  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) updates.status = input.status;
  if (input.channel !== undefined) updates.channel = input.channel;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.themeId !== undefined) updates.themeId = input.themeId;

  // If schema changes, increment version
  if (input.schema !== undefined) {
    updates.schema = JSON.parse(JSON.stringify(input.schema));
    updates.version = survey.version + 1;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(400, "No valid fields to update");
  }

  return prisma.survey.update({
    where: { id },
    data: updates,
    include: { theme: { select: { id: true, name: true, config: true } } },
  });
}

export async function deleteSurvey(id: string) {
  const survey = await prisma.survey.findUnique({ where: { id } });
  if (!survey) throw new AppError(404, "Survey not found");

  return prisma.survey.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
}

export async function submitResponse(surveyId: string, input: CreateSurveyResponseInput) {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new AppError(404, "Survey not found");

  if (survey.status !== "ACTIVE") {
    throw new AppError(400, "Survey is not accepting responses");
  }

  // Extract the schema to check for non-public fields (accessLevel < 5)
  const schema = survey.schema as unknown as SurveySchemaDefinition;
  const nonPublicFieldIds = new Set(
    schema.questions
      .filter((q) => {
        const level = q.accessLevel ?? (q.private ? 0 : 5);
        return level < 5;
      })
      .map((q) => q.id),
  );

  // Reject if any non-public field keys are present in the answers
  const submittedKeys = Object.keys(input.answers);
  const rejectedKeys = submittedKeys.filter((key) => nonPublicFieldIds.has(key));
  if (rejectedKeys.length > 0) {
    throw new AppError(
      400,
      `Non-public fields must not be submitted to the server: ${rejectedKeys.join(", ")}`,
    );
  }

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId,
      orgId: survey.orgId,
      answers: JSON.parse(JSON.stringify(input.answers)),
      version: survey.version,
    },
  });

  // If the survey has a report channel, create ReportMetadata
  if (survey.channel === "PDR125" || survey.channel === "WHISTLEBLOWING") {
    await createReportMetadataFromResponse(survey, input.answers);
  }

  return response;
}

export async function getPublicSurvey(id: string) {
  const survey = await prisma.survey.findUnique({
    where: { id },
    include: { theme: { select: { id: true, name: true, config: true } } },
  });
  if (!survey) throw new AppError(404, "Survey not found");
  if (survey.status !== "ACTIVE") throw new AppError(404, "Survey not found");
  return survey;
}

export async function submitPublicResponse(surveyId: string, input: CreateSurveyResponseInput) {
  return submitResponse(surveyId, input);
}

export async function getResponses(surveyId: string) {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new AppError(404, "Survey not found");

  return prisma.surveyResponse.findMany({
    where: { surveyId },
    orderBy: { submittedAt: "desc" },
  });
}

// ── Report metadata from survey response ────────────────────────────

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // ±5 minutes

export async function createReportMetadataFromResponse(
  survey: { orgId: string; channel: string | null },
  answers: Record<string, unknown>,
  nostrPubkey?: string,
  eventCreatedAt?: number,
) {
  const channel = survey.channel as "PDR125" | "WHISTLEBLOWING";

  // Use the signed Nostr event timestamp as authoritative receivedAt.
  // Reject events with timestamp too far from server time.
  const now = Date.now();
  let receivedAt: Date;
  if (eventCreatedAt != null) {
    const eventMs = eventCreatedAt * 1000;
    const drift = Math.abs(now - eventMs);
    if (drift > MAX_TIMESTAMP_DRIFT_MS) {
      console.warn(
        `Report: rejecting event with timestamp drift ${Math.round(drift / 1000)}s (max ${MAX_TIMESTAMP_DRIFT_MS / 1000}s)`,
      );
      return;
    }
    receivedAt = new Date(eventMs);
  } else {
    receivedAt = new Date(now);
  }

  // Extract category — multi_choice returns an array, take the first
  const rawCategory = answers.category;
  const category = Array.isArray(rawCategory) ? rawCategory[0] as string : (rawCategory as string) ?? null;

  // Extract identity flag from wants_contact
  const wantsContact = answers.wants_contact as string | undefined;
  const identityRevealed = wantsContact === "yes" ? true : wantsContact === "no" ? false : null;

  // Calculate SLA deadlines from org config
  const org = await prisma.organization.findUnique({
    where: { id: survey.orgId },
    select: { pdrSlaAckDays: true, pdrSlaResponseDays: true, wbSlaAckDays: true, wbSlaResponseDays: true },
  });

  const ackDays = channel === "PDR125" ? (org?.pdrSlaAckDays ?? 3) : (org?.wbSlaAckDays ?? 7);
  const responseDays = channel === "PDR125" ? (org?.pdrSlaResponseDays ?? 45) : (org?.wbSlaResponseDays ?? 90);

  const slaAckDeadline = new Date(receivedAt.getTime() + ackDays * 24 * 60 * 60 * 1000);
  const slaResponseDeadline = new Date(receivedAt.getTime() + responseDays * 24 * 60 * 60 * 1000);

  const report = await prisma.reportMetadata.create({
    data: {
      orgId: survey.orgId,
      channel,
      category,
      identityRevealed,
      hasAttachments: false,
      receivedAt,
      slaAckDeadline,
      slaResponseDeadline,
      ...(nostrPubkey && { nostrPubkey }),
    },
  });

  // Append to tamper-evident audit log
  await appendAuditLog("ReportMetadata", report.id, "CREATE", {
    orgId: survey.orgId,
    channel,
    category,
    receivedAt: receivedAt.toISOString(),
    nostrPubkey: nostrPubkey ?? null,
    eventCreatedAt: eventCreatedAt ?? null,
  });
}
