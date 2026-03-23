"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { saveKeyBlob, markKeyBackupCompleted, saveLevelPubKeys } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import {
  generateKeypair,
  encryptPrivateKey,
  type KeypairData,
  type EncryptedKeyBlob,
} from "@/lib/crypto/keypair";
import { deriveLevelKeys } from "@/lib/crypto/level-keys";
import { split, shareToWords, wordsToShare, combine } from "@/lib/crypto/shamir";
import { Check, Copy, Shield, Key, Lock } from "lucide-react";

type Step = "password" | "generate" | "backup" | "verify" | "done";

export default function KeypairSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [keypair, setKeypair] = useState<KeypairData | null>(null);
  const [encBlob, setEncBlob] = useState<EncryptedKeyBlob | null>(null);
  const [shares, setShares] = useState<string[]>([]);
  const [verifyInput, setVerifyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function handleGenerateKeypair() {
    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      return;
    }
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const kp = await generateKeypair();
      setKeypair(kp);

      const blob = await encryptPrivateKey(kp.x25519Priv, password);
      setEncBlob(blob);

      // Create single recovery phrase (threshold 1)
      const shamirShares = split(kp.x25519Priv, 1, 1);
      setShares(shamirShares.map(shareToWords));

      setStep("backup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Key generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyShare(idx: number) {
    await navigator.clipboard.writeText(shares[idx]);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function handleBackupDone() {
    setStep("verify");
  }

  async function handleVerify() {
    setError(null);

    try {
      const share = wordsToShare(verifyInput.trim());
      // Verify it's one of our shares
      const match = shares.find((s) => s === verifyInput.trim());
      if (!match) {
        setError("La frase non corrisponde. Ricontrolla di averla copiata correttamente.");
        return;
      }

      // Save to server
      setLoading(true);
      await saveKeyBlob(JSON.stringify(encBlob), keypair!.x25519Pub, true);

      // Derive level pub keys and save to org
      const user = getStoredUser();
      if (user?.orgId) {
        try {
          const { pubKeys } = await deriveLevelKeys(keypair!.x25519Priv);
          await saveLevelPubKeys(user.orgId, pubKeys);
        } catch {
          // Non-fatal: level keys can be regenerated later
          console.warn("Failed to save level pub keys");
        }
      }

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleFinish() {
    const user = getStoredUser();
    const role = user?.role?.toUpperCase();
    router.push(role === "ODV" ? "/odv/dashboard" : "/rpg/dashboard");
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <PageHeader
        title="Configurazione chiavi"
        subtitle="Genera la tua chiave crittografica per decrittare i dati privati"
      />

      {/* Step 1: Password */}
      {step === "password" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Imposta password</CardTitle>
            </div>
            <CardDescription>
              Questa password proteggerà la tua chiave privata. Scegli una password forte.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kp-password">Password</Label>
              <Input
                id="kp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kp-confirm">Conferma password</Label>
              <Input
                id="kp-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleGenerateKeypair} disabled={loading}>
              {loading ? "Generazione..." : "Genera chiave"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Backup shares */}
      {step === "backup" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Backup di recupero</CardTitle>
            </div>
            <CardDescription>
              La tua frase di recupero permette di ripristinare la chiave crittografica.
              Copiala e conservala in un luogo sicuro.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {shares.map((share, idx) => (
              <div key={idx} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Parte {idx + 1}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleCopyShare(idx)}>
                    {copiedIdx === idx ? (
                      <><Check className="h-3.5 w-3.5 text-green-600" /> Copiata</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copia</>
                    )}
                  </Button>
                </div>
                <p className="text-sm leading-relaxed break-words">{share}</p>
              </div>
            ))}
            <Button onClick={handleBackupDone} className="mt-2">
              Ho salvato la frase di recupero
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Verify */}
      {step === "verify" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Verifica backup</CardTitle>
            </div>
            <CardDescription>
              Incolla la frase di recupero per confermare che l{"'"}hai salvata.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="verify-share">Incolla la frase di recupero</Label>
              <textarea
                id="verify-share"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="alba alto amo cane canto ..."
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleVerify} disabled={loading || !verifyInput.trim()}>
              {loading ? "Salvataggio..." : "Verifica e attiva"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <CardTitle>Chiave configurata</CardTitle>
            </div>
            <CardDescription>
              La tua chiave crittografica è attiva. Potrai decrittare i dati privati
              delle risposte ai sondaggi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFinish}>Vai alla dashboard</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
