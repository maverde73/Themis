import { z } from "zod";

const uuidPattern = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);

// ── Question type enum ──────────────────────────────────────────────────

const questionTypeEnum = z.enum([
  "choice",
  "multi_choice",
  "text",
  "long_text",
  "rating",
  "likert",
  "date",
  "nps",
  "ranking",
  "section",
]);

// ── Branch condition ────────────────────────────────────────────────────

const branchConditionSchema: z.ZodType = z.lazy(() =>
  z.object({
    field: z.string().optional(),
    op: z.enum(["eq", "neq", "gt", "lt", "gte", "lte", "in", "contains"]).optional(),
    value: z.unknown().optional(),
    all: z.array(branchConditionSchema).optional(),
    any: z.array(branchConditionSchema).optional(),
  }),
);

// ── Question schema ─────────────────────────────────────────────────────

const questionSchema = z.object({
  id: z.string().min(1),
  type: questionTypeEnum,
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
  private: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
  statements: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
  showIf: branchConditionSchema.optional(),
});

// ── Survey schema definition (the JSON schema stored in the survey) ─────

const surveySchemaDefinition = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1),
});

// ── CRUD schemas ────────────────────────────────────────────────────────

export const createSurveySchema = z.object({
  orgId: uuidPattern,
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  schema: surveySchemaDefinition,
});

export const updateSurveySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  schema: surveySchemaDefinition.optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).optional(),
});

export const surveyQuerySchema = z.object({
  org_id: uuidPattern,
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).optional(),
});

// Response schema validates that ONLY public field answers are present.
// The actual validation of which fields are private happens in the service layer
// since it requires reading the survey schema from DB.
export const createSurveyResponseSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

// ── Exported types ──────────────────────────────────────────────────────

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type SurveyQueryInput = z.infer<typeof surveyQuerySchema>;
export type CreateSurveyResponseInput = z.infer<typeof createSurveyResponseSchema>;
export type SurveyQuestion = z.infer<typeof questionSchema>;
export type SurveySchemaDefinition = z.infer<typeof surveySchemaDefinition>;
