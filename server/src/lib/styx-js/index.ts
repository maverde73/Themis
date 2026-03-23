/**
 * styx-js — Browser-side crypto for FidesVox Nostr-based form submission.
 *
 * This module is bundled as an IIFE and inlined in the HTML form.
 * It provides: keypair generation, E2E encryption, PoW mining,
 * Nostr event signing, and relay publishing.
 *
 * Dependencies (bundled inline): @noble/curves, @noble/hashes, @noble/ciphers
 */

// @ts-ignore — esbuild needs .js extensions for noble package exports
import { schnorr, secp256k1 } from "@noble/curves/secp256k1.js";
// @ts-ignore
import { x25519 } from "@noble/curves/ed25519.js";
// @ts-ignore
import { sha256 } from "@noble/hashes/sha2.js";
// @ts-ignore
import { hkdf } from "@noble/hashes/hkdf.js";
// @ts-ignore
import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
// @ts-ignore
import { bytesToHex, hexToBytes, utf8ToBytes, randomBytes } from "@noble/hashes/utils.js";

// ── Types ──────────────────────────────────────────────────────────────

interface Keypair {
  secp256k1Priv: Uint8Array;
  secp256k1Pub: string; // hex, x-only
  x25519Priv: Uint8Array;
  x25519Pub: string; // hex
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

interface FidesVoxConfig {
  surveyId: string;
  orgId: string;
  relayUrls: string[];
  recipientPubKey: string; // x25519 hex (RPG pubkey)
  serverPubKey: string; // x25519 hex (server pubkey)
  powDifficulty: number;
}

// ── Keypair ────────────────────────────────────────────────────────────

function generateKeypair(): Keypair {
  const priv = randomBytes(32);
  const secp256k1Pub = bytesToHex(schnorr.getPublicKey(priv));
  const x25519Pub = bytesToHex(x25519.getPublicKey(priv));
  return {
    secp256k1Priv: priv,
    secp256k1Pub,
    x25519Priv: priv,
    x25519Pub,
  };
}

// ── Encryption ─────────────────────────────────────────────────────────

function encrypt(plaintext: string, recipientX25519Pub: string, senderKeypair: Keypair): string {
  const recipientPubBytes = hexToBytes(recipientX25519Pub);
  const sharedSecret = x25519.getSharedSecret(senderKeypair.x25519Priv, recipientPubBytes);
  const encKey = hkdf(sha256, sharedSecret, utf8ToBytes("fidesvox-e2e"), undefined, 32);

  const nonce = randomBytes(12);
  const cipher = chacha20poly1305(encKey, nonce);
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext));

  // Combine: nonce || ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);

  // Format: ephPubHex + base64(nonce||ciphertext)
  const b64 = btoa(String.fromCharCode(...combined));
  return senderKeypair.x25519Pub + b64;
}

// ── PoW Mining (NIP-13) ────────────────────────────────────────────────

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

function serializeEvent(pubkey: string, created_at: number, kind: number, tags: string[][], content: string): string {
  return JSON.stringify([0, pubkey, created_at, kind, tags, content]);
}

function minePoW(
  pubkey: string,
  created_at: number,
  kind: number,
  tags: string[][],
  content: string,
  difficulty: number,
): { id: string; tags: string[][] } {
  const powTags = [...tags, ["nonce", "0", String(difficulty)]];
  const nonceIdx = powTags.length - 1;
  let nonce = 0;

  while (true) {
    powTags[nonceIdx][1] = String(nonce);
    const ser = serializeEvent(pubkey, created_at, kind, powTags, content);
    const hash = sha256(utf8ToBytes(ser));
    if (countLeadingZeroBits(hash) >= difficulty) {
      return { id: bytesToHex(hash), tags: powTags };
    }
    nonce++;
  }
}

// ── Nostr Event ────────────────────────────────────────────────────────

function createSignedEvent(
  keypair: Keypair,
  kind: number,
  tags: string[][],
  content: string,
  difficulty: number,
): NostrEvent {
  const created_at = Math.floor(Date.now() / 1000);

  const { id, tags: finalTags } = minePoW(
    keypair.secp256k1Pub,
    created_at,
    kind,
    tags,
    content,
    difficulty,
  );

  const sig = bytesToHex(schnorr.sign(hexToBytes(id), keypair.secp256k1Priv));

  return {
    id,
    pubkey: keypair.secp256k1Pub,
    created_at,
    kind,
    tags: finalTags,
    content,
    sig,
  };
}

// ── Relay Publishing ───────────────────────────────────────────────────

function publishToRelay(url: string, event: NostrEvent): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 10000);

      ws.onopen = () => {
        ws.send(JSON.stringify(["EVENT", event]));
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (Array.isArray(data) && data[0] === "OK") {
            clearTimeout(timeout);
            ws.close();
            resolve(data[2] === true);
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

function subscribeForReceipt(
  url: string,
  ephPubKey: string,
  timeout: number = 30000,
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close();
        resolve(null);
      }, timeout);

      ws.onopen = () => {
        ws.send(
          JSON.stringify([
            "REQ",
            "receipt",
            {
              kinds: [4003],
              "#p": [ephPubKey],
            },
          ]),
        );
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (Array.isArray(data) && data[0] === "EVENT" && data[2]) {
            clearTimeout(timer);
            ws.close();
            resolve(data[2]);
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

// ── Main Submit Flow ───────────────────────────────────────────────────

interface SubmitResult {
  success: boolean;
  receipt: Record<string, unknown> | null;
  error?: string;
}

async function submitForm(
  config: FidesVoxConfig,
  privateAnswers: Record<string, unknown>,
  publicAnswers: Record<string, unknown>,
  onStatus?: (status: string) => void,
): Promise<SubmitResult> {
  try {
    onStatus?.("Generating keypair...");
    const keypair = generateKeypair();

    const baseTags: string[][] = [["t", "fidesvox"]];

    // Build private event (kind 4000)
    const hasPrivate = Object.keys(privateAnswers).length > 0;
    if (hasPrivate) {
      onStatus?.("Encrypting private data...");
      const privatePlaintext = JSON.stringify({
        type: "survey_private",
        survey_id: config.surveyId,
        org_id: config.orgId,
        submitted_at: new Date().toISOString(),
        private_answers: privateAnswers,
      });
      const privateEncrypted = encrypt(privatePlaintext, config.recipientPubKey, keypair);

      onStatus?.("Mining PoW for private event...");
      const privateEvent = createSignedEvent(keypair, 4000, baseTags, privateEncrypted, config.powDifficulty);

      onStatus?.("Publishing private event...");
      for (const url of config.relayUrls) {
        await publishToRelay(url, privateEvent);
      }
    }

    // Build public+meta event (kind 4001)
    onStatus?.("Encrypting public data...");
    const publicPlaintext = JSON.stringify({
      type: "survey_public_and_meta",
      survey_id: config.surveyId,
      org_id: config.orgId,
      submitted_at: new Date().toISOString(),
      channel: "WEB",
      has_private_bucket: hasPrivate,
      public_answers: publicAnswers,
    });
    const publicEncrypted = encrypt(publicPlaintext, config.serverPubKey, keypair);

    onStatus?.("Mining PoW for public event...");
    const publicEvent = createSignedEvent(keypair, 4001, baseTags, publicEncrypted, config.powDifficulty);

    onStatus?.("Publishing public event...");
    for (const url of config.relayUrls) {
      await publishToRelay(url, publicEvent);
    }

    // Wait for receipt
    onStatus?.("Waiting for receipt...");
    let receipt: Record<string, unknown> | null = null;
    for (const url of config.relayUrls) {
      receipt = await subscribeForReceipt(url, keypair.secp256k1Pub, 30000);
      if (receipt) break;
    }

    onStatus?.(receipt ? "Registered by server" : "Submitted (no receipt yet)");
    return { success: true, receipt };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    onStatus?.(`Error: ${message}`);
    return { success: false, receipt: null, error: message };
  }
}

// ── Expose globally ────────────────────────────────────────────────────

(globalThis as Record<string, unknown>).FidesVox = {
  generateKeypair,
  encrypt,
  minePoW,
  createSignedEvent,
  publishToRelay,
  subscribeForReceipt,
  submitForm,
};
