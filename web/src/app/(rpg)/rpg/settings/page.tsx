"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getStoredUser, type StoredUser } from "@/lib/auth";
import {
  generatePairingQr,
  getSetupStatus,
  getOrganization,
  getKeyBlob,
  saveKeyBlob,
  type PairingQrResponse,
  type SetupStatus,
  type Organization,
} from "@/lib/api";
import { decryptPrivateKey, encryptPrivateKey, type EncryptedKeyBlob } from "@/lib/crypto/keypair";
import { split, shareToWords, wordsToShare, combine } from "@/lib/crypto/shamir";
import { cacheKeypair } from "@/lib/crypto/key-sync";
import {
  Building2,
  QrCode,
  Download,
  Printer,
  RefreshCw,
  KeyRound,
  Copy,
  Check,
  Eye,
  RotateCcw,
} from "lucide-react";

export default function RpgSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [qrData, setQrData] = useState<PairingQrResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Backup recovery state
  const [showBackup, setShowBackup] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupShares, setBackupShares] = useState<string[] | null>(null);
  const [copiedShareIdx, setCopiedShareIdx] = useState<number | null>(null);

  // Restore from phrase state
  const [showRestore, setShowRestore] = useState(false);
  const [restorePhrase, setRestorePhrase] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const isRpgOrOdv = user && ["RPG", "ODV"].includes(user.role.toUpperCase());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const stored = getStoredUser();
    if (!stored?.orgId) {
      router.replace("/login");
      return;
    }
    setUser(stored);

    Promise.all([
      getOrganization(stored.orgId),
      getSetupStatus(stored.orgId),
    ])
      .then(([orgData, status]) => {
        setOrg(orgData);
        setSetupStatus(status);
      })
      .catch(() => {
        setError("Errore nel caricamento delle informazioni.");
      });
  }, [router]);

  const handleGenerateQr = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await generatePairingQr(user.orgId!);
      setQrData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore nella generazione del QR code",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleDownloadPng = useCallback(() => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.download = `themis-qr-${org?.slug || "pairing"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  }, [org]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  async function handleShowBackup() {
    if (!backupPassword) return;
    setBackupLoading(true);
    setBackupError(null);
    try {
      const keyData = await getKeyBlob();
      if (!keyData.encryptedKeyBlob) {
        setBackupError("Nessuna chiave trovata sul server. Completa prima la configurazione chiavi.");
        return;
      }

      const blob: EncryptedKeyBlob = JSON.parse(keyData.encryptedKeyBlob);
      const privKey = await decryptPrivateKey(blob, backupPassword);

      // Split into 1-of-5 shares and convert to words
      const shares = split(privKey, 1, 1);
      setBackupShares(shares.map(shareToWords));
      setBackupPassword("");
    } catch {
      setBackupError("Password non corretta.");
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleCopyShare(idx: number) {
    if (!backupShares) return;
    await navigator.clipboard.writeText(backupShares[idx]);
    setCopiedShareIdx(idx);
    setTimeout(() => setCopiedShareIdx(null), 2000);
  }

  async function handleRestore() {
    if (!restorePhrase.trim()) return;
    if (restorePassword.length < 8) {
      setRestoreError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (restorePassword !== restoreConfirm) {
      setRestoreError("Le password non coincidono.");
      return;
    }

    setRestoreLoading(true);
    setRestoreError(null);
    try {
      // Decode mnemonic phrase back to private key
      const share = wordsToShare(restorePhrase.trim());
      const privKey = combine([share]);

      // Derive public key
      const { x25519 } = await import("@noble/curves/ed25519.js");
      const { bytesToHex } = await import("@noble/hashes/utils.js");
      const pubKey = bytesToHex(x25519.getPublicKey(privKey));

      // Encrypt with new password
      const blob = await encryptPrivateKey(privKey, restorePassword);

      // Save to server
      await saveKeyBlob(JSON.stringify(blob), pubKey, true);

      // Cache in IndexedDB
      await cacheKeypair({ x25519Priv: privKey, x25519Pub: pubKey });

      setRestoreSuccess(true);
      setRestorePhrase("");
      setRestorePassword("");
      setRestoreConfirm("");
    } catch (err) {
      setRestoreError(
        err instanceof Error ? err.message : "Frase non valida o errore nel ripristino.",
      );
    } finally {
      setRestoreLoading(false);
    }
  }

  function resetRestore() {
    setShowRestore(false);
    setRestorePhrase("");
    setRestorePassword("");
    setRestoreConfirm("");
    setRestoreError(null);
    setRestoreSuccess(false);
  }

  const canGenerateQr =
    setupStatus?.rpgConfigured && setupStatus?.odvConfigured;

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Org info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Organizzazione</CardTitle>
            </div>
            <CardDescription>Dati della tua organizzazione.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{org?.name || "..."}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Piano</dt>
                <dd>
                  <Badge variant="outline">{org?.slug || "..."}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">RPG</dt>
                <dd>
                  {setupStatus?.rpgConfigured ? (
                    <Badge className="bg-green-600">Configurata</Badge>
                  ) : (
                    <Badge variant="secondary">Non configurata</Badge>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">OdV</dt>
                <dd>
                  {setupStatus?.odvConfigured ? (
                    <Badge className="bg-green-600">Configurato</Badge>
                  ) : (
                    <Badge variant="secondary">Non configurato</Badge>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* QR code */}
        <Card className="print:border-none print:shadow-none">
          <CardHeader className="print:hidden">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-muted-foreground" />
              <CardTitle>QR Code Dipendenti</CardTitle>
            </div>
            <CardDescription>
              Genera il QR da far scansionare ai dipendenti per configurare l{"'"}app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canGenerateQr && (
              <p className="text-sm text-muted-foreground">
                Configura prima sia la RPG che l{"'"}OdV per poter generare il QR code.
              </p>
            )}

            {canGenerateQr && !qrData && (
              <Button onClick={handleGenerateQr} disabled={loading}>
                {loading ? "Generazione..." : "Genera QR Code"}
              </Button>
            )}

            {qrData && (
              <div className="flex flex-col items-center gap-4">
                <div ref={qrRef} className="rounded-lg bg-white p-4">
                  <QRCodeSVG
                    value={JSON.stringify(qrData)}
                    size={typeof window !== "undefined" && window.innerWidth < 768 ? 200 : 256}
                    level="M"
                  />
                </div>

                <p className="hidden text-center text-lg font-semibold print:block">
                  {org?.name}
                </p>

                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" size="sm" onClick={handleDownloadPng}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Scarica PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                    Stampa
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateQr}
                  disabled={loading}
                  className="print:hidden"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Rigenera QR Code
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backup recovery — only for RPG/OdV */}
      {isRpgOrOdv && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Backup chiave di recupero</CardTitle>
              </div>
              {backupShares && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setBackupShares(null); setShowBackup(false); }}
                >
                  Chiudi
                </Button>
              )}
            </div>
            <CardDescription>
              Visualizza la frase di recupero della tua chiave crittografica.
              Permette di ripristinare l{"'"}accesso ai dati in caso di emergenza.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showBackup && !backupShares && (
              <Button
                variant="outline"
                onClick={() => setShowBackup(true)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Mostra backup
              </Button>
            )}

            {showBackup && !backupShares && (
              <form
                className="flex flex-col gap-3 max-w-sm"
                onSubmit={(e) => { e.preventDefault(); handleShowBackup(); }}
              >
                <div>
                  <Label className="mb-1 text-sm">Password di crittografia</Label>
                  <Input
                    type="password"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    placeholder="Inserisci la password usata durante la configurazione"
                    autoComplete="current-password"
                    autoFocus
                  />
                </div>
                {backupError && (
                  <p className="text-sm text-destructive">{backupError}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={backupLoading || !backupPassword}>
                    {backupLoading ? "Decriptazione..." : "Sblocca backup"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setShowBackup(false); setBackupPassword(""); setBackupError(null); }}
                  >
                    Annulla
                  </Button>
                </div>
              </form>
            )}

            {backupShares && backupShares[0] && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
                  Conserva questa frase in un luogo sicuro. Non condividerla con nessuno.
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Frase di recupero
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => handleCopyShare(0)}
                    >
                      {copiedShareIdx === 0 ? (
                        <><Check className="h-3.5 w-3.5 text-green-600" /> Copiata</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copia</>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed break-words">{backupShares[0]}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Restore from phrase — only for RPG/OdV */}
      {isRpgOrOdv && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Ripristina chiave</CardTitle>
              </div>
              {(showRestore || restoreSuccess) && (
                <Button variant="ghost" size="sm" onClick={resetRestore}>
                  Chiudi
                </Button>
              )}
            </div>
            <CardDescription>
              Ripristina la chiave crittografica dalla frase di recupero e imposta una nuova password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showRestore && !restoreSuccess && (
              <Button variant="outline" onClick={() => setShowRestore(true)} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Ripristina da frase
              </Button>
            )}

            {showRestore && !restoreSuccess && (
              <form
                className="flex flex-col gap-4 max-w-sm"
                onSubmit={(e) => { e.preventDefault(); handleRestore(); }}
              >
                <div>
                  <Label className="mb-1 text-sm">Frase di recupero</Label>
                  <textarea
                    value={restorePhrase}
                    onChange={(e) => setRestorePhrase(e.target.value)}
                    placeholder="alba alto amo cane canto ..."
                    rows={3}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="mb-1 text-sm">Nuova password</Label>
                  <Input
                    type="password"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Almeno 8 caratteri"
                  />
                </div>
                <div>
                  <Label className="mb-1 text-sm">Conferma password</Label>
                  <Input
                    type="password"
                    value={restoreConfirm}
                    onChange={(e) => setRestoreConfirm(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                {restoreError && (
                  <p className="text-sm text-destructive">{restoreError}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={restoreLoading || !restorePhrase.trim() || !restorePassword}
                  >
                    {restoreLoading ? "Ripristino..." : "Ripristina chiave"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetRestore}>
                    Annulla
                  </Button>
                </div>
              </form>
            )}

            {restoreSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800/50 dark:bg-green-950/30">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Chiave ripristinata con successo.
                </p>
                <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                  La chiave è stata salvata con la nuova password e sincronizzata su questo dispositivo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
