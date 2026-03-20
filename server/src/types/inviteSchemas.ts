import { z } from "zod";

const uuidPattern = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);

export const createInviteSchema = z.object({
  orgId: uuidPattern,
  role: z.enum(["rpg", "odv"]),
});

export const claimInviteSchema = z.object({
  publicKey: z.string().min(1),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type ClaimInviteInput = z.infer<typeof claimInviteSchema>;
