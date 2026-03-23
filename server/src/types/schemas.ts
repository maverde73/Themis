import { z } from "zod";

const uuidPattern = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID");

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "RPG", "ODV", "TECHNICAL"]),
  orgId: uuidPattern.optional(),
}).refine(
  (data) => data.role === "SUPER_ADMIN" || data.orgId !== undefined,
  { message: "orgId is required for non-super-admin roles", path: ["orgId"] },
);

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

// POST /reports/metadata — anonymous reporter sends ONLY these fields.
// receivedAt is always server-generated (from signed Nostr event or server clock).
// .strict() rejects any extra fields with 400.
export const createReportMetadataSchema = z.object({
  orgId: uuidPattern,
  channel: z.enum(["PDR125", "WHISTLEBLOWING"]),
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
  correctiveAction: z.string().max(2000).optional(),
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

export const anonTokenRequestSchema = z.object({
  orgId: uuidPattern,
  timestamp: z.number().int(),
  nonce: z.string().min(1).max(128),
  proof: z.string().min(1),
}).strict();

export const listReportMetadataQuerySchema = z.object({
  org_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID"),
  channel: z.enum(["PDR125", "WHISTLEBLOWING"]).optional(),
  status: z.enum([
    "RECEIVED", "ACKNOWLEDGED", "INVESTIGATING", "RESPONSE_GIVEN",
    "CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH",
  ]).optional(),
  category: z.string().min(1).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort_by: z.enum(["receivedAt", "status"]).optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const exportRegistroQuerySchema = z.object({
  org_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID"),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  channel: z.enum(["PDR125", "WHISTLEBLOWING"]).optional(),
  format: z.enum(["pdf", "json"]).default("pdf"),
});

export type ExportRegistroQuery = z.infer<typeof exportRegistroQuerySchema>;
export type ListReportMetadataQuery = z.infer<typeof listReportMetadataQuerySchema>;
export type AnonTokenRequestInput = z.infer<typeof anonTokenRequestSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateKeysInput = z.infer<typeof updateKeysSchema>;
export type CreateReportMetadataInput = z.infer<typeof createReportMetadataSchema>;
export type EnrichReportMetadataInput = z.infer<typeof enrichReportMetadataSchema>;
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;
