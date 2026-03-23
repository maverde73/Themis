/**
 * x25519 keypair generation and password-based encryption.
 * Uses Web Crypto API for PBKDF2 + AES-GCM encryption of private key.
 */

export interface KeypairData {
  x25519Pub: string; // hex
  x25519Priv: Uint8Array; // 32 bytes
}

export interface EncryptedKeyBlob {
  salt: string; // hex
  iv: string; // hex
  ciphertext: string; // hex
}

// We use dynamic import for noble since Next.js handles ESM well
async function getNoble() {
  const { x25519 } = await import("@noble/curves/ed25519.js");
  const { bytesToHex, hexToBytes, randomBytes } = await import(
    "@noble/hashes/utils.js"
  );
  return { x25519, bytesToHex, hexToBytes, randomBytes };
}

export async function generateKeypair(): Promise<KeypairData> {
  const { x25519, bytesToHex, randomBytes } = await getNoble();
  const priv = randomBytes(32);
  const pub = x25519.getPublicKey(priv);
  return {
    x25519Pub: bytesToHex(pub),
    x25519Priv: priv,
  };
}

// Helper to cast Uint8Array for Web Crypto API (TS5 strict ArrayBuffer typing)
function buf(data: Uint8Array): BufferSource {
  return data as unknown as BufferSource;
}

export async function encryptPrivateKey(
  privKey: Uint8Array,
  password: string,
): Promise<EncryptedKeyBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: buf(salt), iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: buf(iv) }, aesKey, buf(privKey)),
  );

  const { bytesToHex } = await getNoble();
  return {
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(ciphertext),
  };
}

export async function decryptPrivateKey(
  blob: EncryptedKeyBlob,
  password: string,
): Promise<Uint8Array> {
  const { hexToBytes } = await getNoble();
  const salt = hexToBytes(blob.salt);
  const iv = hexToBytes(blob.iv);
  const ciphertext = hexToBytes(blob.ciphertext);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: buf(salt), iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(iv) }, aesKey, buf(ciphertext)),
  );
}
