/**
 * Key sync: manages encrypted private key storage in IndexedDB
 * and synchronization with the server's key blob.
 *
 * On login: if server has a key blob but local IndexedDB doesn't,
 * the user is prompted for their encryption password to decrypt and cache.
 */

import { getKeyBlob, type KeyBlobData } from "@/lib/api";
import { decryptPrivateKey, type EncryptedKeyBlob } from "./keypair";
import { decryptLevelKey, cacheLevelKey, getCachedLevelKey } from "./level-keys";

const DB_NAME = "fidesvox-keys";
const DB_VERSION = 1;
const STORE_NAME = "keypair";
const KEY_ID = "current";

export interface CachedKeypair {
  x25519Priv: Uint8Array;
  x25519Pub: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedKeypair(): Promise<CachedKeypair | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY_ID);
    req.onsuccess = () => {
      const result = req.result;
      if (!result) {
        resolve(null);
        return;
      }
      resolve({
        x25519Priv: new Uint8Array(result.x25519Priv),
        x25519Pub: result.x25519Pub,
      });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function cacheKeypair(keypair: CachedKeypair): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id: KEY_ID,
      x25519Priv: Array.from(keypair.x25519Priv),
      x25519Pub: keypair.x25519Pub,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearCachedKeypair(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Check if key sync is needed after login.
 * Returns the key blob data if the user has a server-side blob but no local cache.
 */
export async function checkKeySyncNeeded(): Promise<KeyBlobData | null> {
  try {
    const serverBlob = await getKeyBlob();
    if (!serverBlob.encryptedKeyBlob) return null;

    const cached = await getCachedKeypair();
    if (cached) return null;

    return serverBlob;
  } catch {
    return null;
  }
}

/**
 * Decrypt the server key blob with the user's password and cache locally.
 */
export async function syncKeyFromServer(
  encryptedKeyBlobJson: string,
  nostrPubkey: string,
  password: string,
): Promise<CachedKeypair> {
  const blob: EncryptedKeyBlob = JSON.parse(encryptedKeyBlobJson);
  const privKey = await decryptPrivateKey(blob, password);

  const keypair: CachedKeypair = {
    x25519Priv: privKey,
    x25519Pub: nostrPubkey,
  };

  await cacheKeypair(keypair);
  return keypair;
}

/**
 * Sync level key for approved users.
 * If the user has an encryptedLevelKey from server and no cached level key,
 * decrypt it using their personal private key and cache it.
 */
export async function syncLevelKey(
  encryptedLevelKey: string,
  dataLevel: number,
): Promise<boolean> {
  try {
    // Check if already cached
    const existing = await getCachedLevelKey();
    if (existing) return true;

    // Need personal private key from IndexedDB to decrypt
    const cached = await getCachedKeypair();
    if (!cached) return false;

    const levelKey = await decryptLevelKey(encryptedLevelKey, cached.x25519Priv);
    await cacheLevelKey(levelKey, dataLevel);
    return true;
  } catch {
    return false;
  }
}
