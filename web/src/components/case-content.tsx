"use client";

import { useState, useEffect, useCallback } from "react";
import { Lock, Unlock, ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getNostrEventByPubkey, getPrivateEvents } from "@/lib/api";
import { useCrypto } from "@/lib/crypto/crypto-context";
import { decryptPrivateEvent, type DecryptedContent } from "@/lib/crypto/decrypt";

interface CaseContentProps {
  reportReceivedAt: string;
  orgId: string;
  nostrPubkey: string | null;
  canDecrypt: boolean;
}

export function CaseContent({ reportReceivedAt, orgId, nostrPubkey, canDecrypt }: CaseContentProps) {
  const { isUnlocked, keypair } = useCrypto();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<DecryptedContent | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decryptForReport = useCallback(async (privKey: Uint8Array): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setNoMatch(false);
    setContent(null);
    try {
      // Strategy 1: Direct lookup by nostrPubkey (fast, exact)
      if (nostrPubkey) {
        const event = await getNostrEventByPubkey(nostrPubkey);
        if (event) {
          try {
            const decrypted = await decryptPrivateEvent(event.content, privKey);
            setContent(decrypted);
            return true;
          } catch {
            // Wrong key — event exists but can't decrypt with this key
          }
        }
      }

      // Strategy 2: Fallback — scan all events and match by timestamp
      const events = await getPrivateEvents(500, 0);
      const reportTime = new Date(reportReceivedAt).getTime();

      for (const ev of events) {
        try {
          const decrypted = await decryptPrivateEvent(ev.content, privKey);
          if (decrypted.org_id !== orgId) continue;
          const submittedTime = new Date(decrypted.submitted_at).getTime();
          if (Math.abs(reportTime - submittedTime) < 120_000) {
            setContent(decrypted);
            return true;
          }
        } catch {
          // Encrypted for different key, skip
        }
      }

      setNoMatch(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento");
      return false;
    } finally {
      setLoading(false);
    }
  }, [nostrPubkey, reportReceivedAt, orgId]);

  // React to keypair changes from context
  useEffect(() => {
    if (!canDecrypt || !keypair) {
      setContent(null);
      setNoMatch(false);
      setError(null);
      return;
    }
    let cancelled = false;
    decryptForReport(keypair.x25519Priv).then((ok) => {
      if (!ok && !cancelled) {
        setError(null);
        setNoMatch(false);
      }
    });
    return () => { cancelled = true; };
  }, [canDecrypt, keypair, decryptForReport]);

  if (!canDecrypt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Contenuto segnalazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Il contenuto è riservato al Responsabile Parità di Genere.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Contenuto segnalazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Decrittazione in corso...</p>
        </CardContent>
      </Card>
    );
  }

  if (isUnlocked && content) {
    const answers = content.answers ?? content.private_answers ?? {};
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Unlock className="h-4 w-4 text-emerald-600" />
            Contenuto segnalazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(answers).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun campo privato nella segnalazione.</p>
          ) : (
            <div className="grid gap-3">
              {Object.entries(answers).map(([key, val]) => (
                <div key={key} className="flex flex-col gap-0.5 rounded-md border p-3">
                  <span className="text-xs font-medium text-muted-foreground">{key}</span>
                  <span className="text-sm whitespace-pre-wrap">{formatAnswer(val)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isUnlocked && noMatch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Contenuto segnalazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessun contenuto crittografato trovato per questa segnalazione.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Locked — prompt user to unlock via sidebar
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4" />
          Contenuto segnalazione
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Sblocca le chiavi dal menu laterale per visualizzare il contenuto.
        </p>
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatAnswer(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (typeof val === "string") return val;
  if (typeof val === "boolean") return val ? "Sì" : "No";
  if (Array.isArray(val)) return val.join(", ");
  return JSON.stringify(val);
}
