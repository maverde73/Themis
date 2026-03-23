"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getKeyBlob } from "@/lib/api";
import { getCachedKeypair, syncKeyFromServer, clearCachedKeypair, type CachedKeypair } from "./key-sync";

interface CryptoState {
  /** Whether the private key is currently unlocked in memory */
  isUnlocked: boolean;
  /** The decrypted keypair (null when locked) */
  keypair: CachedKeypair | null;
  /** True while checking IndexedDB on mount */
  loading: boolean;
  /** Unlock with password — resolves true on success, throws on bad password */
  unlock: (password: string) => Promise<void>;
  /** Lock — clears key from memory and IndexedDB */
  lock: () => Promise<void>;
}

const CryptoContext = createContext<CryptoState | null>(null);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [keypair, setKeypair] = useState<CachedKeypair | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if there's a cached keypair in IndexedDB
  useEffect(() => {
    let cancelled = false;
    getCachedKeypair()
      .then((cached) => {
        if (!cancelled && cached) setKeypair(cached);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const unlock = useCallback(async (password: string) => {
    const blob = await getKeyBlob();
    if (!blob.encryptedKeyBlob) {
      throw new Error("Nessuna chiave configurata per questo utente");
    }
    const kp = await syncKeyFromServer(
      blob.encryptedKeyBlob,
      blob.nostrPubkey!,
      password,
    );
    setKeypair(kp);
  }, []);

  const lock = useCallback(async () => {
    setKeypair(null);
    await clearCachedKeypair();
  }, []);

  return (
    <CryptoContext.Provider
      value={{
        isUnlocked: keypair !== null,
        keypair,
        loading,
        unlock,
        lock,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoState {
  const ctx = useContext(CryptoContext);
  if (!ctx) throw new Error("useCrypto must be used within CryptoProvider");
  return ctx;
}
