import { schnorr } from "@noble/curves/secp256k1.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { randomBytes } from "crypto";
import { config } from "./config";

let _secp256k1Privkey: Uint8Array | null = null;
let _secp256k1Pubkey: string | null = null;
let _x25519Privkey: Uint8Array | null = null;
let _x25519Pubkey: string | null = null;

function ensureKeys(): void {
  if (_secp256k1Privkey) return;

  if (config.nostrPrivkey) {
    _secp256k1Privkey = hexToBytes(config.nostrPrivkey);
  } else {
    _secp256k1Privkey = randomBytes(32);
    console.warn(
      `NOSTR_PRIVKEY not set — generated ephemeral key. Set NOSTR_PRIVKEY=${bytesToHex(_secp256k1Privkey)} in .env for persistence.`,
    );
  }

  _secp256k1Pubkey = bytesToHex(schnorr.getPublicKey(_secp256k1Privkey));

  // Derive x25519 key from the same 32-byte secret
  // (x25519 clamps internally, so using same bytes is safe)
  _x25519Privkey = _secp256k1Privkey;
  _x25519Pubkey = bytesToHex(x25519.getPublicKey(_x25519Privkey));
}

export function getSecp256k1Privkey(): Uint8Array {
  ensureKeys();
  return _secp256k1Privkey!;
}

export function getSecp256k1Pubkey(): string {
  ensureKeys();
  return _secp256k1Pubkey!;
}

export function getX25519Privkey(): Uint8Array {
  ensureKeys();
  return _x25519Privkey!;
}

export function getX25519Pubkey(): string {
  ensureKeys();
  return _x25519Pubkey!;
}
