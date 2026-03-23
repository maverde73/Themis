import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { AppError } from "../middleware/errorHandler";
import type { Role } from "../generated/prisma/client";
import type { CreateInviteInput, ClaimInviteInput, RegisterViaInviteInput } from "../types/inviteSchemas";
import type { JwtPayload } from "../types";

const INVITE_EXPIRY_HOURS = 72;

export async function createInvite(input: CreateInviteInput, createdById?: string) {
  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  return prisma.invite.create({
    data: {
      orgId: input.orgId,
      role: input.role,
      email: input.email,
      createdById: createdById,
      orgRoleId: input.orgRoleId,
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
    email: invite.email,
    orgRoleId: invite.orgRoleId,
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

export async function registerViaInvite(token: string, input: RegisterViaInviteInput) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { org: { select: { name: true } } },
  });
  if (!invite) throw new AppError(404, "Invite not found");
  if (invite.claimed) throw new AppError(400, "Invite already claimed");
  if (new Date() > invite.expiresAt) throw new AppError(400, "Invite expired");

  // If invite has a specific email, enforce it
  if (invite.email && invite.email !== input.email) {
    throw new AppError(400, "Email does not match the invite");
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, "Email already registered");

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const roleEnum = invite.role.toUpperCase() as Role;

  // TECHNICAL users get edit permissions by default
  const isTechnical = roleEnum === "TECHNICAL";

  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role: roleEnum,
        orgId: invite.orgId,
        orgRoleId: invite.orgRoleId || undefined,
        canEditSurveys: isTechnical,
        canEditThemes: isTechnical,
      },
    }),
    prisma.invite.update({
      where: { token },
      data: { claimed: true, claimedAt: new Date() },
    }),
  ]);

  const jwtPayload: JwtPayload = {
    userId: user.id,
    orgId: user.orgId,
    role: invite.role as JwtPayload["role"],
  };
  const jwtToken = jwt.sign(jwtPayload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });

  return {
    user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
    token: jwtToken,
    orgName: invite.org.name,
  };
}

export async function getSetupStatus(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  return {
    rpgConfigured: org.rpgPublicKey !== null,
    odvConfigured: org.odvPublicKey !== null,
  };
}
