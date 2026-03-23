"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOrganization,
  createInvite,
  uploadKeys,
  getSetupStatus,
  type InviteResponse,
  type SetupStatus,
} from "@/lib/api";

const PLANS = [
  { value: "STARTER", label: "Starter", description: "Fino a 50 dipendenti" },
  { value: "PROFESSIONAL", label: "Professional", description: "Fino a 500 dipendenti" },
  { value: "ENTERPRISE", label: "Enterprise", description: "Dipendenti illimitati" },
] as const;

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [plan, setPlan] = useState("STARTER");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite state
  const [rpgInvite, setRpgInvite] = useState<InviteResponse | null>(null);
  const [odvInvite, setOdvInvite] = useState<InviteResponse | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    rpgConfigured: false,
    odvConfigured: false,
  });

  // Advanced mode
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rpgKey, setRpgKey] = useState("");
  const [odvKey, setOdvKey] = useState("");

  // Polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await getSetupStatus(id);
        setSetupStatus(status);
        if (status.rpgConfigured && status.odvConfigured) {
          stopPolling();
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);
  }, [stopPolling]);

  const handleCreateOrg = async () => {
    setLoading(true);
    setError(null);
    try {
      const org = await createOrganization(orgName.trim(), plan);
      setOrgId(org.id);

      // Store token for setup-status auth
      // The createOrganization doesn't require auth, but setup-status does.
      // For MVP, we'll use the org creator flow. In production this would
      // be part of the registration + auto-login flow.

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async (role: "rpg" | "odv") => {
    if (!orgId) return;
    setError(null);
    try {
      const invite = await createInvite(orgId, role);
      if (role === "rpg") setRpgInvite(invite);
      else setOdvInvite(invite);
      startPolling(orgId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore generazione invito");
    }
  };

  const handleAdvancedUpload = async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      await uploadKeys(orgId, rpgKey.trim(), odvKey.trim());
      setSetupStatus({ rpgConfigured: true, odvConfigured: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore upload chiavi");
    } finally {
      setLoading(false);
    }
  };

  const inviteCode = (token: string) => token;

  const bothConfigured = setupStatus.rpgConfigured && setupStatus.odvConfigured;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Themis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Piattaforma zero-knowledge per compliance
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Registra la tua organizzazione"}
              {step === 2 && "Configura i responsabili"}
              {step === 3 && "Configurazione completata"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Inserisci il nome dell'organizzazione e seleziona un piano."}
              {step === 2 && "Invita la RPG e l'OdV a configurare l'app sui loro dispositivi."}
              {step === 3 && "Configurazione completata! Accedi e vai a Impostazioni per generare il QR code per i dipendenti."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Step 1: Org info */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org-name">Nome organizzazione</Label>
                  <Input
                    id="org-name"
                    placeholder="Nexa Data S.r.l."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="plan">Piano</Label>
                  <Select value={plan} onValueChange={(v) => { if (v) setPlan(v); }}>
                    <SelectTrigger id="plan" className="w-full">
                      <SelectValue placeholder="Seleziona un piano" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label} — {p.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Invite flow */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                {/* RPG Setup */}
                <SetupSection
                  title="RPG — Responsabile Parità di Genere"
                  subtitle="Gestisce le segnalazioni PdR 125 (molestie, discriminazioni)"
                  configured={setupStatus.rpgConfigured}
                  invite={rpgInvite}
                  inviteCode={rpgInvite ? inviteCode(rpgInvite.token) : null}
                  onGenerate={() => handleGenerateInvite("rpg")}
                />

                {/* OdV Setup */}
                <SetupSection
                  title="OdV — Organismo di Vigilanza"
                  subtitle="Gestisce le segnalazioni Whistleblowing (D.Lgs. 24/2023)"
                  configured={setupStatus.odvConfigured}
                  invite={odvInvite}
                  inviteCode={odvInvite ? inviteCode(odvInvite.token) : null}
                  onGenerate={() => handleGenerateInvite("odv")}
                />

                {/* Advanced mode toggle */}
                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    {showAdvanced ? "Nascondi" : "Mostra"} modalità avanzata (sviluppatori)
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-dashed p-3">
                      <p className="text-xs text-muted-foreground">
                        Inserimento manuale delle chiavi pubbliche (solo per testing/sviluppo)
                      </p>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="rpg-key" className="text-xs">RPG public key (hex)</Label>
                        <Input
                          id="rpg-key"
                          placeholder="Ed25519 hex..."
                          value={rpgKey}
                          onChange={(e) => setRpgKey(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="odv-key" className="text-xs">OdV public key (hex)</Label>
                        <Input
                          id="odv-key"
                          placeholder="Ed25519 hex..."
                          value={odvKey}
                          onChange={(e) => setOdvKey(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAdvancedUpload}
                        disabled={!rpgKey.trim() || !odvKey.trim() || loading}
                      >
                        Carica chiavi manualmente
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {step === 3 && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <span className="text-3xl">&#10003;</span>
                </div>
                <div className="text-center">
                  <p className="font-medium">{orgName}</p>
                  <p className="text-sm text-muted-foreground">
                    Entrambi i canali sono configurati. Genera il QR code per i dipendenti
                    dalla sezione impostazioni.
                  </p>
                </div>
                {orgId && (
                  <p className="text-xs text-muted-foreground">
                    ID organizzazione: <code className="font-mono">{orgId}</code>
                  </p>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            {step === 1 && <div />}
            {step === 1 && (
              <Button
                onClick={handleCreateOrg}
                disabled={!orgName.trim() || loading}
              >
                {loading ? "Creazione..." : "Avanti"}
              </Button>
            )}

            {step === 2 && (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Indietro
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!bothConfigured}
                >
                  {bothConfigured ? "Avanti" : "In attesa della configurazione..."}
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <div />
                <Button onClick={() => window.location.href = "/login"}>
                  Vai al login
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}

// ── Setup section component ──────────────────────────────────────────────

function SetupSection({
  title,
  subtitle,
  configured,
  invite,
  inviteCode,
  onGenerate,
}: {
  title: string;
  subtitle: string;
  configured: boolean;
  invite: InviteResponse | null;
  inviteCode: string | null;
  onGenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {configured ? (
          <Badge variant="default" className="bg-green-600">Configurato</Badge>
        ) : (
          <Badge variant="secondary">In attesa</Badge>
        )}
      </div>

      {!configured && !invite && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={onGenerate}
        >
          Genera codice di invito
        </Button>
      )}

      {!configured && invite && inviteCode && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Codice di invito — comunicalo al responsabile:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-center text-sm font-mono tracking-wider">
              {inviteCode}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copiato!" : "Copia"}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
            In attesa di configurazione dall{"'"}app...
          </div>
          <p className="text-xs text-muted-foreground">
            Il responsabile inserirà questo codice nell{"'"}app Themis Gestione sul suo telefono.
          </p>
        </div>
      )}
    </div>
  );
}
