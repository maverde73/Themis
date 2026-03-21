import { z } from "zod";

const uuidPattern = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);

// ── i18n types ──────────────────────────────────────────────────────────

// Accepts either a plain string or a locale→string map (backwards compat)
const i18nString = z.union([z.string().min(1), z.record(z.string(), z.string())]);
const i18nStringOptional = z.union([z.string(), z.record(z.string(), z.string())]);

// Accepts either a plain string or { value, label } (backwards compat)
const i18nOption = z.union([
  z.string(),
  z.object({ value: z.string(), label: i18nString }),
]);

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
  label: i18nString,
  description: i18nStringOptional.optional(),
  required: z.boolean().optional(),
  private: z.boolean().optional().default(false),
  options: z.array(i18nOption).optional(),
  statements: z.array(i18nOption).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLabel: i18nStringOptional.optional(),
  maxLabel: i18nStringOptional.optional(),
  showIf: branchConditionSchema.optional(),
});

// ── Survey schema definition (the JSON schema stored in the survey) ─────

const surveySchemaDefinition = z.object({
  title: i18nString,
  description: i18nStringOptional.optional(),
  buttonLabel: i18nStringOptional.optional(),
  buttonDescription: i18nStringOptional.optional(),
  questions: z.array(questionSchema).min(1),
});

// ── CRUD schemas ────────────────────────────────────────────────────────

export const createSurveySchema = z.object({
  orgId: uuidPattern,
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  schema: surveySchemaDefinition,
  channel: z.string().optional(),
  icon: z.string().optional(),
  themeId: uuidPattern.optional().nullable(),
});

export const updateSurveySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  schema: surveySchemaDefinition.optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).optional(),
  channel: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  themeId: uuidPattern.optional().nullable(),
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

export const importTemplateSchema = z.object({
  templateId: z.union([
    z.string().min(1),
    z.array(z.string().min(1)),
  ]),
});

// ── Exported types ──────────────────────────────────────────────────────

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type SurveyQueryInput = z.infer<typeof surveyQuerySchema>;
export type CreateSurveyResponseInput = z.infer<typeof createSurveyResponseSchema>;
export type ImportTemplateInput = z.infer<typeof importTemplateSchema>;
export type SurveyQuestion = z.infer<typeof questionSchema>;
export type SurveySchemaDefinition = z.infer<typeof surveySchemaDefinition>;
