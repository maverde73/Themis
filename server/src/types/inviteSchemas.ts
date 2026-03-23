import { z } from "zod";

const uuidPattern = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);

export const createInviteSchema = z.object({
  orgId: uuidPattern,
  role: z.enum(["rpg", "odv", "technical", "admin"]),
  email: z.string().email().optional(),
  orgRoleId: uuidPattern.optional(),
});

export const claimInviteSchema = z.object({
  publicKey: z.string().min(1),
});

export const registerViaInviteSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type ClaimInviteInput = z.infer<typeof claimInviteSchema>;
export type RegisterViaInviteInput = z.infer<typeof registerViaInviteSchema>;
