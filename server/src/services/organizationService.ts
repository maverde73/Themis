import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import type { CreateOrganizationInput, UpdateKeysInput } from "../types/schemas";

export async function create(input: CreateOrganizationInput) {
  return prisma.organization.create({
    data: {
      name: input.name,
      plan: input.plan || "STARTER",
      relayUrls: input.relayUrls || ["ws://localhost:7777"],
    },
  });
}

export async function getById(id: string) {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError(404, "Organization not found");
  return org;
}

export async function updateKeys(id: string, input: UpdateKeysInput) {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError(404, "Organization not found");

  return prisma.organization.update({
    where: { id },
    data: {
      ...(input.rpgPublicKey && { rpgPublicKey: input.rpgPublicKey }),
      ...(input.odvPublicKey && { odvPublicKey: input.odvPublicKey }),
    },
  });
}

export async function generatePairingQr(id: string) {
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) throw new AppError(404, "Organization not found");

  if (!org.rpgPublicKey || !org.odvPublicKey) {
    throw new AppError(400, "Both RPG and OdV public keys must be set before generating pairing QR");
  }

  const pairingQrData = {
    orgId: org.id,
    rpgPublicKey: org.rpgPublicKey,
    odvPublicKey: org.odvPublicKey,
    relayUrls: org.relayUrls,
  };

  await prisma.organization.update({
    where: { id },
    data: { pairingQrData },
  });

  return pairingQrData;
}
