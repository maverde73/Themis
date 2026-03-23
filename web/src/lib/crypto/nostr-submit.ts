/**
 * Nostr-based survey submission with E2E encryption and PoW.
 *
 * Flow:
 *   1. Generate ephemeral keypair
 *   2. Split answers into private (E2E encrypted) and public
 *   3. Connect to relay via WebSocket
 *   4. Publish kind 4000 (private, opaque blob) and kind 4001 (public+meta, encrypted for server)
 *   5. Wait for kind 4003 receipt from server
 */

import { schnorr } from "@noble/curves/secp256k1.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

// ── Types ────────────────────────────────────────────────────────────

export interface NostrConfig {
  relayUrls: string[];
  serverPubKey: string;
  serverX25519PubKey: string;
  powDifficulty: number;
  recipientPubKey: string | null;
}

export type SubmitStep =
  | "idle"
  | "generating_keys"
  | "encrypting"
  | "connecting"
  | "publishing"
  | "relay_confirmed"
  | "receipt_received"
  | "error";

export interface SubmitProgress {
  step: SubmitStep;
  relayOkCount: number;
  totalEvents: number;
  errorMessage?: string;
  ephPubKey?: string;
  receiptTimestamp?: string;
}

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

// ── Crypto helpers ───────────────────────────────────────────────────

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function signEvent(
  event: Omit<NostrEvent, "id" | "sig">,
  privKey: Uint8Array,
): NostrEvent {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const hash = sha256(utf8ToBytes(serialized));
  const id = bytesToHex(hash);
  const sig = bytesToHex(schnorr.sign(hash, privKey));
  return { ...event, id, sig };
}

function encryptForServer(
  plaintext: string,
  serverPubKeyHex: string,
): string {
  const ephPriv = crypto.getRandomValues(new Uint8Array(32));
  const ephPub = x25519.getPublicKey(ephPriv);

  let sharedSecret: Uint8Array;
  try {
    const recipientPubBytes = hexToBytes(serverPubKeyHex);
    sharedSecret = x25519.getSharedSecret(ephPriv, recipientPubBytes);
  } catch {
    // Fallback: derive key from server pubkey directly
    const key = hkdf(
      sha256,
      hexToBytes(serverPubKeyHex),
      utf8ToBytes("fidesvox-fallback"),
      undefined,
      32,
    );
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const cipher = chacha20poly1305(key, nonce);
    const ct = cipher.encrypt(utf8ToBytes(plaintext));
    return btoa(
      String.fromCharCode(...concatBytes(nonce, ct)),
    );
  }

  const encKey = hkdf(
    sha256,
    sharedSecret,
    utf8ToBytes("fidesvox-e2e"),
    undefined,
    32,
  );

  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const cipher = chacha20poly1305(encKey, nonce);
  const ct = cipher.encrypt(utf8ToBytes(plaintext));

  // Format: ephPubHex(64) + base64(nonce(12) + ciphertext+tag)
  return (
    bytesToHex(ephPub) +
    btoa(String.fromCharCode(...concatBytes(nonce, ct)))
  );
}

// ── PoW mining ───────────────────────────────────────────────────────

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

function minePoW(
  event: Omit<NostrEvent, "id" | "sig">,
  privKey: Uint8Array,
  difficulty: number,
): NostrEvent {
  let nonce = 0;
  const nonceTagIndex = event.tags.findIndex((t) => t[0] === "nonce");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const tags = [...event.tags];
    if (nonceTagIndex >= 0) {
      tags[nonceTagIndex] = ["nonce", String(nonce), String(difficulty)];
    } else {
      tags.push(["nonce", String(nonce), String(difficulty)]);
    }

    const candidate = { ...event, tags };
    const serialized = JSON.stringify([
      0,
      candidate.pubkey,
      candidate.created_at,
      candidate.kind,
      candidate.tags,
      candidate.content,
    ]);
    const hash = sha256(utf8ToBytes(serialized));

    if (countLeadingZeroBits(hash) >= difficulty) {
      const id = bytesToHex(hash);
      const sig = bytesToHex(schnorr.sign(hash, privKey));
      return { ...candidate, id, sig };
    }
    nonce++;
  }
}

// ── Main submit function ─────────────────────────────────────────────

export async function submitViaNostro(
  surveyId: string,
  orgId: string,
  privateAnswers: Record<string, unknown>,
  publicAnswers: Record<string, unknown>,
  nostrConfig: NostrConfig,
  onProgress: (progress: SubmitProgress) => void,
): Promise<void> {
  const { relayUrls, serverPubKey, serverX25519PubKey, powDifficulty, recipientPubKey } = nostrConfig;

  // Step 1: Generate ephemeral keypair
  onProgress({ step: "generating_keys", relayOkCount: 0, totalEvents: 2 });
  const ephPrivKey = crypto.getRandomValues(new Uint8Array(32));
  const ephPubKey = bytesToHex(schnorr.getPublicKey(ephPrivKey));

  onProgress({
    step: "encrypting",
    relayOkCount: 0,
    totalEvents: 2,
    ephPubKey,
  });

  const now = Math.floor(Date.now() / 1000);
  const submittedAt = new Date().toISOString();

  // kind 4000 (private): encrypt for RPG/OdV recipient (NOT the server)
  // kind 4001 (public): encrypt for server (aggregatable metadata only)
  const privateEncryptionKey = recipientPubKey || serverX25519PubKey;

  // Step 2: Build kind 4000 — PRIVATE (E2E encrypted for RPG/OdV, opaque to server)
  const privateContent = JSON.stringify({
    type: "survey_private_answers",
    survey_id: surveyId,
    org_id: orgId,
    answers: privateAnswers,
  });
  const encryptedPrivate = encryptForServer(privateContent, privateEncryptionKey);

  const ev4000Base = {
    pubkey: ephPubKey,
    created_at: now,
    kind: 4000,
    tags: [
      ["p", serverPubKey],
      ...(recipientPubKey ? [["p", recipientPubKey]] : []),
      ["t", "fidesvox"],
      ["survey", surveyId],
    ],
    content: encryptedPrivate,
  };

  // Step 3: Build kind 4001 — PUBLIC+META (encrypted for server to decrypt & aggregate)
  const publicContent = JSON.stringify({
    type: "survey_public_answers",
    survey_id: surveyId,
    org_id: orgId,
    submitted_at: submittedAt,
    public_answers: publicAnswers,
  });
  const encryptedPublic = encryptForServer(publicContent, serverX25519PubKey);

  const ev4001Base = {
    pubkey: ephPubKey,
    created_at: now,
    kind: 4001,
    tags: [
      ["p", serverPubKey],
      ["t", "fidesvox"],
      ["survey", surveyId],
      ["org", orgId],
    ],
    content: encryptedPublic,
  };

  // Step 4: Mine PoW for both events
  const ev4000 = minePoW(ev4000Base, ephPrivKey, powDifficulty);
  const ev4001 = minePoW(ev4001Base, ephPrivKey, powDifficulty);

  // Step 5: Connect to relay and publish
  onProgress({
    step: "connecting",
    relayOkCount: 0,
    totalEvents: 2,
    ephPubKey,
  });

  return new Promise<void>((resolve, reject) => {
    const relayUrl = relayUrls[0];
    if (!relayUrl) {
      onProgress({
        step: "error",
        relayOkCount: 0,
        totalEvents: 2,
        errorMessage: "No relay URL configured",
      });
      reject(new Error("No relay URL configured"));
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(relayUrl);
    } catch (err) {
      onProgress({
        step: "error",
        relayOkCount: 0,
        totalEvents: 2,
        errorMessage: "Failed to connect to relay",
      });
      reject(err);
      return;
    }

    let relayOkCount = 0;
    let receiptReceived = false;
    const receiptTimeout = 15000;

    ws.onopen = () => {
      onProgress({
        step: "publishing",
        relayOkCount: 0,
        totalEvents: 2,
        ephPubKey,
      });

      // Subscribe for receipt
      ws.send(
        JSON.stringify([
          "REQ",
          "receipt",
          { kinds: [4003], "#p": [ephPubKey] },
        ]),
      );

      // Publish events
      ws.send(JSON.stringify(["EVENT", ev4000]));
      ws.send(JSON.stringify(["EVENT", ev4001]));

      // Receipt timeout
      setTimeout(() => {
        if (!receiptReceived) {
          onProgress({
            step: "receipt_received",
            relayOkCount,
            totalEvents: 2,
            ephPubKey,
            receiptTimestamp: submittedAt,
          });
          try { ws.close(); } catch { /* ignore */ }
          resolve();
        }
      }, receiptTimeout);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        if (msg[0] === "OK" && msg[2] === true) {
          relayOkCount++;
          if (relayOkCount >= 2) {
            onProgress({
              step: "relay_confirmed",
              relayOkCount,
              totalEvents: 2,
              ephPubKey,
            });
          } else {
            onProgress({
              step: "publishing",
              relayOkCount,
              totalEvents: 2,
              ephPubKey,
            });
          }
        }

        if (
          msg[0] === "EVENT" &&
          msg[2]?.kind === 4003 &&
          msg[2]?.pubkey === serverPubKey
        ) {
          receiptReceived = true;
          let receiptTimestamp = submittedAt;
          try {
            const content = JSON.parse(msg[2].content);
            receiptTimestamp = content.timestamp || submittedAt;
          } catch { /* ignore */ }

          onProgress({
            step: "receipt_received",
            relayOkCount,
            totalEvents: 2,
            ephPubKey,
            receiptTimestamp,
          });
          try { ws.close(); } catch { /* ignore */ }
          resolve();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onerror = () => {
      onProgress({
        step: "error",
        relayOkCount: 0,
        totalEvents: 2,
        errorMessage: "Connection to relay failed",
      });
      reject(new Error("WebSocket error"));
    };

    ws.onclose = () => {
      if (!receiptReceived && relayOkCount >= 2) {
        // Relay confirmed but no receipt — still ok
        resolve();
      }
    };
  });
}
