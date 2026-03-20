import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import type { CreateEscrowShareInput } from "../types/escrowSchemas";

export async function createShare(input: CreateEscrowShareInput) {
  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  return prisma.escrowShare.upsert({
    where: {
      orgId_channel_shareIndex: {
        orgId: input.orgId,
        channel: input.channel,
        shareIndex: input.shareIndex,
      },
    },
    update: {
      encryptedShare: input.encryptedShare,
      holderEmail: input.holderEmail,
    },
    create: {
      orgId: input.orgId,
      channel: input.channel,
      shareIndex: input.shareIndex,
      encryptedShare: input.encryptedShare,
      holderEmail: input.holderEmail,
    },
  });
}

export async function getShares(orgId: string, channel?: string) {
  return prisma.escrowShare.findMany({
    where: {
      orgId,
      ...(channel && { channel: channel as "PDR125" | "WHISTLEBLOWING" }),
    },
    orderBy: { shareIndex: "asc" },
  });
}

export async function deleteShare(id: string) {
  const share = await prisma.escrowShare.findUnique({ where: { id } });
  if (!share) throw new AppError(404, "Escrow share not found");

  return prisma.escrowShare.delete({ where: { id } });
}
