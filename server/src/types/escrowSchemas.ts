import { z } from "zod";

const uuidPattern = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID");

export const createEscrowShareSchema = z.object({
  orgId: uuidPattern,
  channel: z.enum(["PDR125", "WHISTLEBLOWING"]),
  shareIndex: z.number().int().min(0),
  encryptedShare: z.string().min(1),
  holderEmail: z.string().email(),
});

export const escrowQuerySchema = z.object({
  org_id: uuidPattern,
  channel: z.enum(["PDR125", "WHISTLEBLOWING"]).optional(),
});

export type CreateEscrowShareInput = z.infer<typeof createEscrowShareSchema>;
export type EscrowQueryInput = z.infer<typeof escrowQuerySchema>;
