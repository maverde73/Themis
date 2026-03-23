"use client";

import { useState } from "react";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { decryptPrivateKey, type EncryptedKeyBlob } from "@/lib/crypto/keypair";
import { decryptPrivateEvent, type DecryptedContent } from "@/lib/crypto/decrypt";
import { getKeyBlob } from "@/lib/api";

interface EncryptedResponseViewerProps {
  encryptedEvents: Array<{
    id: string;
    content: string;
    createdAt: number;
  }>;
}

export function EncryptedResponseViewer({ encryptedEvents }: EncryptedResponseViewerProps) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [decryptedResponses, setDecryptedResponses] = useState<
    Array<{ id: string; data: DecryptedContent | null; error?: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUnlock() {
    if (!password) return;
    setError(null);
    setLoading(true);

    try {
      // Get encrypted key blob from server
      const keyBlobData = await getKeyBlob();
      if (!keyBlobData.encryptedKeyBlob) {
        setError("Nessuna chiave configurata. Vai a Impostazioni → Configura chiave.");
        return;
      }

      // Decrypt private key with password
      const blob: EncryptedKeyBlob = JSON.parse(keyBlobData.encryptedKeyBlob);
      const privKey = await decryptPrivateKey(blob, password);

      // Decrypt each event
      const results = await Promise.all(
        encryptedEvents.map(async (event) => {
          try {
            const data = await decryptPrivateEvent(event.content, privKey);
            return { id: event.id, data };
          } catch (err) {
            return {
              id: event.id,
              data: null,
              error: err instanceof Error ? err.message : "Decryption failed",
            };
          }
        }),
      );

      setDecryptedResponses(results);
      setUnlocked(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes("Decryption failed") || err.message.includes("tag doesn't match")
            ? "Password errata"
            : err.message
          : "Errore di decrittazione",
      );
    } finally {
      setLoading(false);
    }
  }

  if (encryptedEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Risposte private
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nessuna risposta privata ricevuta</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {unlocked ? (
            <Unlock className="h-4 w-4 text-green-600" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          Risposte private ({encryptedEvents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!unlocked ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Inserisci la password della tua chiave per decrittare le risposte private.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label htmlFor="decrypt-password">Password chiave</Label>
                <Input
                  id="decrypt-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Inserisci password"
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                />
              </div>
              <Button onClick={handleUnlock} disabled={loading || !password}>
                {loading ? "Decrittazione..." : "Sblocca"}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {decryptedResponses.map((resp) => (
              <div key={resp.id} className="rounded-md border p-3">
                {resp.data ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-muted-foreground">
                      {new Date(resp.data.submitted_at).toLocaleString("it-IT")}
                    </div>
                    <div className="grid gap-1.5">
                      {Object.entries(resp.data.private_answers).map(([key, val]) => (
                        <div key={key} className="flex gap-2 text-sm">
                          <span className="font-medium min-w-[8rem]">{key}:</span>
                          <span className="text-muted-foreground">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">
                    Errore: {resp.error || "decrittazione fallita"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
