import WebSocket from "ws";
import { schnorr } from "@noble/curves/secp256k1.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { prisma } from "../utils/prisma";
import { config } from "../utils/config";
import { getSecp256k1Pubkey, getX25519Privkey } from "../utils/nostrKeys";
import { publishReceipt } from "./receiptService";
import { createReportMetadataFromResponse } from "./surveyService";

const REQUIRED_DIFFICULTY = config.nostrPowDifficulty;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5;

// Rate limiting per ephemeral pubkey
const rateLimitMap = new Map<string, { count: number; firstSeen: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now - val.firstSeen > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, 60_000);

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

function countLeadingZeroBits(hash: Uint8Array): number {
  let count = 0;
  for (const byte of hash) {
    if (byte === 0) {
      count += 8;
    } else {
      count += Math.clz32(byte) - 24;
      break;
    }
  }
  return count;
}

function verifyEventId(event: NostrEvent): boolean {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const hash = sha256(utf8ToBytes(serialized));
  return bytesToHex(hash) === event.id;
}

function verifySignature(event: NostrEvent): boolean {
  try {
    return schnorr.verify(hexToBytes(event.sig), hexToBytes(event.id), hexToBytes(event.pubkey));
  } catch {
    return false;
  }
}

function verifyPoW(event: NostrEvent): boolean {
  const nonceTag = event.tags.find((t) => t[0] === "nonce");
  if (!nonceTag || parseInt(nonceTag[2], 10) < REQUIRED_DIFFICULTY) return false;

  const hash = hexToBytes(event.id);
  return countLeadingZeroBits(hash) >= REQUIRED_DIFFICULTY;
}

function checkRateLimit(pubkey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(pubkey);
  if (!entry) {
    rateLimitMap.set(pubkey, { count: 1, firstSeen: now });
    return true;
  }
  if (now - entry.firstSeen > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(pubkey, { count: 1, firstSeen: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function decryptKind4001Content(encryptedContent: string): Record<string, unknown> | null {
  try {
    const ephPubHex = encryptedContent.slice(0, 64);
    const b64 = encryptedContent.slice(64);
    const combined = Buffer.from(b64, "base64");

    const sharedSecret = x25519.getSharedSecret(getX25519Privkey(), hexToBytes(ephPubHex));
    const encKey = hkdf(sha256, sharedSecret, utf8ToBytes("fidesvox-e2e"), undefined, 32);

    const nonce = combined.subarray(0, 12);
    const ciphertext = combined.subarray(12);

    const cipher = chacha20poly1305(encKey, nonce);
    const plaintext = cipher.decrypt(ciphertext);
    const text = new TextDecoder().decode(plaintext);
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to decrypt kind 4001:", err);
    return null;
  }
}

async function processEvent(event: NostrEvent): Promise<void> {
  // Dedup check
  const existing = await prisma.nostrEvent.findUnique({ where: { id: event.id } });
  if (existing) return;

  // Verify event id
  if (!verifyEventId(event)) {
    console.warn(`Nostr: invalid event id ${event.id}`);
    return;
  }

  // Verify signature
  if (!verifySignature(event)) {
    console.warn(`Nostr: invalid signature for ${event.id}`);
    return;
  }

  // Verify PoW
  if (!verifyPoW(event)) {
    console.warn(`Nostr: insufficient PoW for ${event.id}`);
    return;
  }

  // Rate limit
  if (!checkRateLimit(event.pubkey)) {
    console.warn(`Nostr: rate limited pubkey ${event.pubkey}`);
    return;
  }

  // Store raw event
  await prisma.nostrEvent.create({
    data: {
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      content: event.content,
      tags: event.tags as never,
      sig: event.sig,
      createdAt: event.created_at,
    },
  });

  if (event.kind === 4000) {
    // PRIVATE — store as opaque blob, don't decrypt
    await prisma.nostrEvent.update({
      where: { id: event.id },
      data: { processed: true },
    });
    console.log(`Nostr: stored private event ${event.id}`);
  } else if (event.kind === 4001) {
    // PUBLIC+META — decrypt and process
    const content = decryptKind4001Content(event.content);
    if (!content) return;

    const surveyId = content.survey_id as string;
    const orgId = content.org_id as string;
    const publicAnswers = content.public_answers as Record<string, unknown>;

    if (surveyId && orgId && publicAnswers) {
      // Verify survey exists
      const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
      if (survey && survey.orgId === orgId) {
        // Check no private fields leaked
        const schema = survey.schema as { questions?: Array<{ id: string; private?: boolean; accessLevel?: number }> };
        const nonPublicFieldIds = (schema.questions || [])
          .filter((q) => {
            const level = q.accessLevel ?? (q.private ? 0 : 5);
            return level < 5;
          })
          .map((q) => q.id);
        const leaked = Object.keys(publicAnswers).filter((k) => nonPublicFieldIds.includes(k));

        if (leaked.length === 0) {
          await prisma.surveyResponse.create({
            data: {
              surveyId,
              orgId,
              answers: publicAnswers as never,
              version: survey.version,
            },
          });

          // Create ReportMetadata if survey has a report channel
          if (survey.channel === "PDR125" || survey.channel === "WHISTLEBLOWING") {
            await createReportMetadataFromResponse(
              { orgId: survey.orgId, channel: survey.channel },
              publicAnswers,
              event.pubkey,
              event.created_at,
            );
          }
        } else {
          console.warn(`Nostr: private fields leaked in ${event.id}, discarding`);
        }
      }
    }

    await prisma.nostrEvent.update({
      where: { id: event.id },
      data: { processed: true },
    });

    // Publish receipt
    await publishReceipt(event.id, event.pubkey, surveyId);
    console.log(`Nostr: processed public event ${event.id}`);
  }
}

function connectToRelay(url: string): void {
  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log(`Nostr: connected to ${url}`);
    // Subscribe to fidesvox events
    ws.send(
      JSON.stringify([
        "REQ",
        "fv-all",
        {
          kinds: [4000, 4001],
          "#t": ["fidesvox"],
        },
      ]),
    );
  });

  ws.on("message", (data: WebSocket.Data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (Array.isArray(msg) && msg[0] === "EVENT" && msg[2]) {
        processEvent(msg[2] as NostrEvent).catch((err) =>
          console.error("Nostr: event processing error:", err),
        );
      }
    } catch {
      // Ignore non-JSON messages
    }
  });

  ws.on("close", () => {
    console.log(`Nostr: disconnected from ${url}, reconnecting in 5s...`);
    setTimeout(() => connectToRelay(url), 5000);
  });

  ws.on("error", (err) => {
    console.error(`Nostr: WebSocket error for ${url}:`, err.message);
  });
}

export function startNostrSubscriber(): void {
  if (!config.nostrPrivkey) {
    console.log("Nostr: NOSTR_PRIVKEY not set, subscriber disabled");
    return;
  }

  console.log(`Nostr: server pubkey (secp256k1): ${getSecp256k1Pubkey()}`);

  for (const url of config.relayUrls) {
    connectToRelay(url);
  }
}
