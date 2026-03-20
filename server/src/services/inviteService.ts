import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import type { CreateInviteInput, ClaimInviteInput } from "../types/inviteSchemas";

const INVITE_EXPIRY_HOURS = 72;

export async function createInvite(input: CreateInviteInput) {
  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  return prisma.invite.create({
    data: {
      orgId: input.orgId,
      role: input.role,
      expiresAt,
    },
  });
}

export async function getInvite(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { org: { select: { name: true } } },
  });
  if (!invite) throw new AppError(404, "Invite not found");
  if (invite.claimed) throw new AppError(400, "Invite already claimed");
  if (new Date() > invite.expiresAt) throw new AppError(400, "Invite expired");

  return {
    orgId: invite.orgId,
    orgName: invite.org.name,
    role: invite.role,
  };
}

export async function claimInvite(token: string, input: ClaimInviteInput) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) throw new AppError(404, "Invite not found");
  if (invite.claimed) throw new AppError(400, "Invite already claimed");
  if (new Date() > invite.expiresAt) throw new AppError(400, "Invite expired");

  // Save public key to organization based on role
  const keyField = invite.role === "rpg" ? "rpgPublicKey" : "odvPublicKey";

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: invite.orgId },
      data: { [keyField]: input.publicKey },
    }),
    prisma.invite.update({
      where: { token },
      data: { claimed: true, claimedAt: new Date() },
    }),
  ]);

  return { success: true, role: invite.role };
}

export async function getSetupStatus(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  return {
    rpgConfigured: org.rpgPublicKey !== null,
    odvConfigured: org.odvPublicKey !== null,
  };
}
