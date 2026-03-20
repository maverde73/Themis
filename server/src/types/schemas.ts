import { z } from "zod";

const uuidPattern = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID");

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["RPG", "ODV", "ADMIN"]),
  orgId: uuidPattern,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  relayUrls: z.array(z.string().url()).optional(),
});

export const updateKeysSchema = z.object({
  rpgPublicKey: z.string().min(1).optional(),
  odvPublicKey: z.string().min(1).optional(),
});

// POST /reports/metadata — anonymous reporter sends ONLY these 3 fields.
// .strict() rejects any extra fields with 400.
export const createReportMetadataSchema = z.object({
  orgId: uuidPattern,
  channel: z.enum(["PDR125", "WHISTLEBLOWING"]),
  receivedAt: z.string().datetime().optional(),
}).strict();

// PUT /reports/metadata/:id — manager enriches after decrypting content
export const enrichReportMetadataSchema = z.object({
  category: z.string().min(1).optional(),
  status: z.enum([
    "RECEIVED",
    "ACKNOWLEDGED",
    "INVESTIGATING",
    "RESPONSE_GIVEN",
    "CLOSED_FOUNDED",
    "CLOSED_UNFOUNDED",
    "CLOSED_BAD_FAITH",
  ]).optional(),
  identityRevealed: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
}).strict();

export const updateReportStatusSchema = z.object({
  status: z.enum([
    "RECEIVED",
    "ACKNOWLEDGED",
    "INVESTIGATING",
    "RESPONSE_GIVEN",
    "CLOSED_FOUNDED",
    "CLOSED_UNFOUNDED",
    "CLOSED_BAD_FAITH",
  ]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateKeysInput = z.infer<typeof updateKeysSchema>;
export type CreateReportMetadataInput = z.infer<typeof createReportMetadataSchema>;
export type EnrichReportMetadataInput = z.infer<typeof enrichReportMetadataSchema>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;
