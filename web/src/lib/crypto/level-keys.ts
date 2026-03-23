/**
 * Hierarchical level key derivation using HKDF chain.
 *
 * key_0 = HKDF(masterKey, "level-0")
 * key_1 = HKDF(key_0, "level-1")
 * key_2 = HKDF(key_1, "level-2")
 * ...
 * key_5 = HKDF(key_4, "level-5")
 *
 * One-way: having key_N you can derive key_N+1..5 but NOT key_N-1.
 * Each key_N is used as x25519 private key → pubkey_N for per-field encryption.
 */

const DB_NAME = "fidesvox-keys";
const DB_VERSION = 1;
const STORE_NAME = "keypair";
const LEVEL_KEY_ID = "level-key";

// Cast helper for Web Crypto API (TS strict ArrayBuffer typing)
function buf(data: Uint8Array): BufferSource {
  return data as unknown as BufferSource;
}

async function getNoble() {
  const { x25519 } = await import("@noble/curves/ed25519.js");
  const { hkdf } = await import("@noble/hashes/hkdf.js");
  const { sha256 } = await import("@noble/hashes/sha2.js");
  const { bytesToHex, utf8ToBytes } = await import("@noble/hashes/utils.js");
  return { x25519, hkdf, sha256, bytesToHex, utf8ToBytes };
}

/**
 * Derive all level keys from a master key (RPG's x25519 private key).
 * Returns keys for levels 0-5 and their corresponding x25519 public keys.
 */
export async function deriveLevelKeys(masterKey: Uint8Array): Promise<{
  keys: Record<number, Uint8Array>;
  pubKeys: Record<string, string>;
}> {
  const { hkdf, sha256, x25519, bytesToHex, utf8ToBytes } = await getNoble();

  const keys: Record<number, Uint8Array> = {};
  const pubKeys: Record<string, string> = {};

  // key_0 = HKDF(masterKey, "level-0")
  keys[0] = hkdf(sha256, masterKey, utf8ToBytes("level-0"), undefined, 32);
  pubKeys["0"] = bytesToHex(x25519.getPublicKey(keys[0]));

  // key_N = HKDF(key_{N-1}, "level-N") for N = 1..5
  for (let i = 1; i <= 5; i++) {
    keys[i] = hkdf(sha256, keys[i - 1], utf8ToBytes(`level-${i}`), undefined, 32);
    pubKeys[String(i)] = bytesToHex(x25519.getPublicKey(keys[i]));
  }

  return { keys, pubKeys };
}

/**
 * Derive keys from level N downward (for a user who has key_N).
 * Returns keys for levels N..5.
 */
export async function deriveKeysFromLevel(
  levelKey: Uint8Array,
  startLevel: number,
): Promise<Record<number, Uint8Array>> {
  const { hkdf, sha256, utf8ToBytes } = await getNoble();

  const keys: Record<number, Uint8Array> = {};
  keys[startLevel] = levelKey;

  for (let i = startLevel + 1; i <= 5; i++) {
    keys[i] = hkdf(sha256, keys[i - 1], utf8ToBytes(`level-${i}`), undefined, 32);
  }

  return keys;
}

/**
 * Encrypt a level key for a specific user using x25519 ECDH + AES-GCM.
 * RPG calls this when approving a user.
 */
export async function encryptLevelKeyForUser(
  levelKey: Uint8Array,
  userPubKeyHex: string,
): Promise<string> {
  const { x25519, bytesToHex } = await getNoble();
  const { hexToBytes } = await import("@noble/hashes/utils.js");

  // Generate ephemeral keypair for ECDH
  const ephPriv = crypto.getRandomValues(new Uint8Array(32));
  const ephPub = x25519.getPublicKey(ephPriv);

  // ECDH shared secret
  const sharedSecret = x25519.getSharedSecret(ephPriv, hexToBytes(userPubKeyHex));

  // Derive AES key from shared secret via Web Crypto
  const aesKeyMaterial = await crypto.subtle.importKey(
    "raw",
    buf(sharedSecret),
    "HKDF",
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: new TextEncoder().encode("fidesvox-level-key") },
    aesKeyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: buf(iv) },
      aesKey,
      buf(levelKey),
    ),
  );

  // Format: ephPubHex(64) + ivHex(24) + ciphertextHex
  return bytesToHex(ephPub) + bytesToHex(iv) + bytesToHex(ciphertext);
}

/**
 * Decrypt a level key that was encrypted for this user.
 * User calls this after RPG approval.
 */
export async function decryptLevelKey(
  encryptedLevelKey: string,
  userPrivKey: Uint8Array,
): Promise<Uint8Array> {
  const { x25519 } = await getNoble();
  const { hexToBytes } = await import("@noble/hashes/utils.js");

  // Parse: ephPubHex(64) + ivHex(24) + ciphertextHex
  const ephPubHex = encryptedLevelKey.slice(0, 64);
  const ivHex = encryptedLevelKey.slice(64, 88);
  const ciphertextHex = encryptedLevelKey.slice(88);

  const ephPub = hexToBytes(ephPubHex);
  const iv = hexToBytes(ivHex);
  const ciphertext = hexToBytes(ciphertextHex);

  // ECDH shared secret
  const sharedSecret = x25519.getSharedSecret(userPrivKey, ephPub);

  // Derive AES key
  const aesKeyMaterial = await crypto.subtle.importKey(
    "raw",
    buf(sharedSecret),
    "HKDF",
    false,
    ["deriveKey"],
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: new TextEncoder().encode("fidesvox-level-key") },
    aesKeyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf(iv) }, aesKey, buf(ciphertext)),
  );
}

// ── IndexedDB cache for level key ──────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheLevelKey(levelKey: Uint8Array, dataLevel: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id: LEVEL_KEY_ID,
      levelKey: Array.from(levelKey),
      dataLevel,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedLevelKey(): Promise<{ levelKey: Uint8Array; dataLevel: number } | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(LEVEL_KEY_ID);
    req.onsuccess = () => {
      const result = req.result;
      if (!result || !result.levelKey) {
        resolve(null);
        return;
      }
      resolve({
        levelKey: new Uint8Array(result.levelKey),
        dataLevel: result.dataLevel,
      });
    };
    req.onerror = () => reject(req.error);
  });
}
