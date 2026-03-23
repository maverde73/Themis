import { createHash } from "crypto";
import { prisma } from "../utils/prisma";

const GENESIS_HASH = "0".repeat(64);

function sha256hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Append an entry to the tamper-evident audit log.
 * chainHash = SHA256(prevHash || dataHash || action || timestamp)
 *
 * Any retroactive modification to earlier entries breaks the chain,
 * making tampering detectable by a simple sequential verification.
 */
export async function appendAuditLog(
  entityType: string,
  entityId: string,
  action: string,
  data: Record<string, unknown>,
): Promise<void> {
  const dataHash = sha256hex(JSON.stringify(data));

  // Get the previous chain hash (latest entry)
  const prev = await prisma.auditLogEntry.findFirst({
    orderBy: { sequence: "desc" },
    select: { chainHash: true },
  });
  const prevHash = prev?.chainHash ?? GENESIS_HASH;

  const now = new Date().toISOString();
  const chainHash = sha256hex(`${prevHash}|${dataHash}|${action}|${now}`);

  await prisma.auditLogEntry.create({
    data: {
      entityType,
      entityId,
      action,
      dataHash,
      prevHash,
      chainHash,
    },
  });
}

/**
 * Verify the entire audit chain integrity.
 * Returns { valid: true } or { valid: false, brokenAt: sequence }.
 */
export async function verifyAuditChain(): Promise<
  { valid: true } | { valid: false; brokenAt: number }
> {
  const entries = await prisma.auditLogEntry.findMany({
    orderBy: { sequence: "asc" },
    select: { sequence: true, prevHash: true, chainHash: true },
  });

  let expectedPrev = GENESIS_HASH;
  for (const entry of entries) {
    if (entry.prevHash !== expectedPrev) {
      return { valid: false, brokenAt: entry.sequence };
    }
    expectedPrev = entry.chainHash;
  }
  return { valid: true };
}
