import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { AppError } from "../middleware/errorHandler";
import type { RegisterInput, LoginInput } from "../types/schemas";
import type { JwtPayload } from "../types";

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
  if (!org) {
    throw new AppError(404, "Organization not found");
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      role: input.role,
      orgId: input.orgId,
    },
  });

  const token = generateToken({ userId: user.id, orgId: user.orgId, role: user.role as JwtPayload["role"] });
  return { user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId }, token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(input.password, user.password);
  if (!valid) {
    throw new AppError(401, "Invalid credentials");
  }

  const token = generateToken({ userId: user.id, orgId: user.orgId, role: user.role as JwtPayload["role"] });
  return { user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId }, token };
}

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}
