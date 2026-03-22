import crypto from "crypto";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import { importTemplate } from "./dashboardService";
import type { CreateOrganizationInput, UpdateKeysInput } from "../types/schemas";

const BUILTIN_ROLES = [
  { name: "Responsabile Parità", slug: "responsabile", dataLevel: 0, isBuiltin: true, description: "Accesso completo ai dati identificativi e ai fatti. Gestisce team e sondaggi." },
];

export async function create(input: CreateOrganizationInput) {
  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name: input.name,
        plan: input.plan || "STARTER",
        relayUrls: input.relayUrls || ["ws://localhost:7777"],
      },
    });

    // Seed builtin org roles
    await tx.orgRole.createMany({
      data: BUILTIN_ROLES.map((r) => ({ ...r, orgId: created.id })),
    });

    return created;
  });

  // Import default dashboard template (outside transaction — non-critical)
  try {
    const template = await prisma.dashboardTemplate.findUnique({
      where: { slug: "cruscotto-pdr125" },
    });
    if (template) {
      await importTemplate(org.id, template.id);
    }
  } catch {
    // Dashboard import failure should not block org creation
  }

  return org;
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

  const pairingSecret = crypto.randomBytes(32).toString("hex");

  const pairingQrData = {
    orgId: org.id,
    rpgPublicKey: org.rpgPublicKey,
    odvPublicKey: org.odvPublicKey,
    relayUrls: org.relayUrls,
    pairingSecret,
  };

  await prisma.organization.update({
    where: { id },
    data: { pairingQrData, pairingSecret },
  });

  return pairingQrData;
}
