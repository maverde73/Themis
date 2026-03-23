/**
 * Decryption of Nostr kind 4000 (private) events.
 * Uses x25519 DH + HKDF + ChaCha20-Poly1305.
 */

export interface DecryptedContent {
  type: string;
  survey_id: string;
  org_id: string;
  submitted_at?: string;
  answers?: Record<string, unknown>;
  private_answers?: Record<string, unknown>;
}

export async function decryptPrivateEvent(
  encryptedContent: string,
  x25519PrivKey: Uint8Array,
): Promise<DecryptedContent> {
  const { x25519 } = await import("@noble/curves/ed25519.js");
  const { sha256 } = await import("@noble/hashes/sha2.js");
  const { hkdf } = await import("@noble/hashes/hkdf.js");
  const { chacha20poly1305 } = await import("@noble/ciphers/chacha.js");
  const { hexToBytes, utf8ToBytes } = await import("@noble/hashes/utils.js");

  // Parse: first 64 hex chars = ephemeral x25519 pubkey, rest = base64(nonce||ciphertext)
  const ephPubHex = encryptedContent.slice(0, 64);
  const b64 = encryptedContent.slice(64);

  // Decode base64
  const binaryStr = atob(b64);
  const combined = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    combined[i] = binaryStr.charCodeAt(i);
  }

  // x25519 DH
  const sharedSecret = x25519.getSharedSecret(x25519PrivKey, hexToBytes(ephPubHex));
  const encKey = hkdf(sha256, sharedSecret, utf8ToBytes("fidesvox-e2e"), undefined, 32);

  // Decrypt
  const nonce = combined.subarray(0, 12);
  const ciphertext = combined.subarray(12);
  const cipher = chacha20poly1305(encKey, nonce);
  const plaintext = cipher.decrypt(ciphertext);

  const text = new TextDecoder().decode(plaintext);
  return JSON.parse(text) as DecryptedContent;
}
