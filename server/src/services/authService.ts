import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { AppError } from "../middleware/errorHandler";
import type { Role } from "../generated/prisma/client";
import type { RegisterInput, LoginInput, AnonTokenRequestInput } from "../types/schemas";
import type { JwtPayload, AnonJwtPayload } from "../types";

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  // SUPER_ADMIN has no org
  if (input.role !== "SUPER_ADMIN") {
    const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
    if (!org) {
      throw new AppError(404, "Organization not found");
    }
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      role: input.role as Role,
      orgId: input.role === "SUPER_ADMIN" ? undefined : input.orgId,
    },
  });

  const token = generateToken({ userId: user.id, orgId: user.orgId, role: user.role.toLowerCase() as JwtPayload["role"] });
  return { user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId }, token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      orgRole: { select: { name: true, dataLevel: true } },
    },
  });
  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    throw new AppError(401, "Invalid credentials");
  }

  const token = generateToken({ userId: user.id, orgId: user.orgId, role: user.role.toLowerCase() as JwtPayload["role"] });

  // Determine effective dataLevel: RPG=0, ODV=0, TECHNICAL=null, others from orgRole
  let dataLevel: number | null = null;
  if (user.role === "RPG" || user.role === "ODV") {
    dataLevel = 0;
  } else if (user.orgRole) {
    dataLevel = user.orgRole.dataLevel;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      canEditSurveys: user.canEditSurveys,
      canEditThemes: user.canEditThemes,
      dataLevel,
      orgRoleName: user.orgRole?.name ?? null,
      encryptedLevelKey: user.encryptedLevelKey,
      approvedAt: user.approvedAt?.toISOString() ?? null,
    },
    token,
  };
}

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

// ── Anonymous token (mobile pairing) ────────────────────────────────────

const TIMESTAMP_DRIFT_SECONDS = 30;
const ANON_TOKEN_EXPIRY_SECONDS = 300; // 5 minutes

// In-memory nonce cache for anti-replay (TTL-based)
const usedNonces = new Map<string, number>();

function pruneNonces(): void {
  const now = Date.now();
  for (const [nonce, expiresAt] of usedNonces) {
    if (now > expiresAt) usedNonces.delete(nonce);
  }
}

export async function generateAnonymousToken(input: AnonTokenRequestInput): Promise<string> {
  // 1. Find org and its pairing secret
  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) throw new AppError(404, "Organization not found");
  if (!org.pairingSecret) throw new AppError(400, "Organization has no pairing secret — regenerate QR");

  // 2. Verify timestamp within ±30 seconds
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - input.timestamp) > TIMESTAMP_DRIFT_SECONDS) {
    throw new AppError(401, "Timestamp out of range");
  }

  // 3. Anti-replay: check nonce
  pruneNonces();
  const nonceKey = `${input.orgId}:${input.nonce}`;
  if (usedNonces.has(nonceKey)) {
    throw new AppError(401, "Nonce already used");
  }
  usedNonces.set(nonceKey, Date.now() + 60_000); // TTL 60s

  // 4. Verify HMAC
  const message = `${input.orgId}|${input.timestamp}|${input.nonce}`;
  const expectedHmac = crypto
    .createHmac("sha256", org.pairingSecret)
    .update(message)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(input.proof, "hex"), Buffer.from(expectedHmac, "hex"))) {
    throw new AppError(401, "Invalid proof");
  }

  // 5. Generate anonymous JWT
  const payload: AnonJwtPayload = { orgId: input.orgId, type: "anonymous" };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: ANON_TOKEN_EXPIRY_SECONDS });
}
