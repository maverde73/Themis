import WebSocket from "ws";
import { schnorr } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { config } from "../utils/config";
import { getSecp256k1Privkey, getSecp256k1Pubkey } from "../utils/nostrKeys";

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

function createSignedEvent(
  kind: number,
  tags: string[][],
  content: string,
): NostrEvent {
  const pubkey = getSecp256k1Pubkey();
  const created_at = Math.floor(Date.now() / 1000);

  const serialized = JSON.stringify([0, pubkey, created_at, kind, tags, content]);
  const hash = sha256(utf8ToBytes(serialized));
  const id = bytesToHex(hash);

  const sig = bytesToHex(schnorr.sign(hash, getSecp256k1Privkey()));

  return { id, pubkey, created_at, kind, tags, content, sig };
}

export async function publishReceipt(
  processedEventId: string,
  browserPubkey: string,
  surveyId?: string,
): Promise<void> {
  const content = JSON.stringify({
    status: "received",
    survey_id: surveyId || null,
    timestamp: new Date().toISOString(),
  });

  const tags = [
    ["p", browserPubkey],
    ["t", "fidesvox"],
    ["e", processedEventId],
  ];

  const event = createSignedEvent(4003, tags, content);

  // Publish to all configured relays
  for (const url of config.relayUrls) {
    publishToRelay(url, event);
  }
}

function publishToRelay(url: string, event: NostrEvent): void {
  const ws = new WebSocket(url);

  ws.on("open", () => {
    ws.send(JSON.stringify(["EVENT", event]));
    // Close after a short delay to allow the relay to process
    setTimeout(() => ws.close(), 2000);
  });

  ws.on("error", (err) => {
    console.error(`Nostr receipt: failed to publish to ${url}:`, err.message);
  });
}
