import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
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

  // Extract the schema to check for private fields
  const schema = survey.schema as unknown as SurveySchemaDefinition;
  const privateFieldIds = new Set(
    schema.questions
      .filter((q) => q.private === true)
      .map((q) => q.id),
  );

  // Reject if any private field keys are present in the answers
  const submittedKeys = Object.keys(input.answers);
  const rejectedKeys = submittedKeys.filter((key) => privateFieldIds.has(key));
  if (rejectedKeys.length > 0) {
    throw new AppError(
      400,
      `Private fields must not be submitted to the server: ${rejectedKeys.join(", ")}`,
    );
  }

  return prisma.surveyResponse.create({
    data: {
      surveyId,
      orgId: survey.orgId,
      answers: JSON.parse(JSON.stringify(input.answers)),
      version: survey.version,
    },
  });
}

export async function getResponses(surveyId: string) {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new AppError(404, "Survey not found");

  return prisma.surveyResponse.findMany({
    where: { surveyId },
    orderBy: { submittedAt: "desc" },
  });
}
