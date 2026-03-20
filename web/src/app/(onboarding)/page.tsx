"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOrganization,
  uploadKeys,
  generatePairingQr,
  type PairingQrResponse,
} from "@/lib/api";

const PLANS = [
  {
    value: "starter",
    label: "Starter",
    description: "Up to 50 employees",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Up to 500 employees",
  },
  {
    value: "enterprise",
    label: "Enterprise",
    description: "Unlimited employees",
  },
] as const;

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [plan, setPlan] = useState("starter");
  const [rpgPublicKey, setRpgPublicKey] = useState("");
  const [odvPublicKey, setOdvPublicKey] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<PairingQrResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return orgName.trim().length > 0;
      case 2:
        return rpgPublicKey.trim().length > 0 && odvPublicKey.trim().length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleGenerateQr = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Create organization
      const org = await createOrganization(orgName.trim(), plan);
      setOrgId(org.id);

      // Step 2: Upload keys
      await uploadKeys(org.id, rpgPublicKey.trim(), odvPublicKey.trim());

      // Step 3: Generate QR pairing data
      const pairing = await generatePairingQr(org.id);
      setQrData(pairing);
      setStep(4);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 3) {
      handleGenerateQr();
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setError(null);
      setStep(step - 1);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Themis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zero-knowledge compliance platform
          </p>
        </div>

        {/* Progress indicator */}
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
              {step === 1 && "Organization details"}
              {step === 2 && "Public keys"}
              {step === 3 && "Generate pairing QR"}
              {step === 4 && "Pairing data"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Enter your organization name and select a plan."}
              {step === 2 &&
                "Provide the public keys for the RPG and OdV channels."}
              {step === 3 &&
                "Review your setup and generate the pairing QR code data."}
              {step === 4 &&
                "Share this pairing data with the mobile app to complete setup."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Step 1: Organization info */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org-name">Organization name</Label>
                  <Input
                    id="org-name"
                    placeholder="Acme Corp"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={plan} onValueChange={(v) => { if (v) setPlan(v); }}>
                    <SelectTrigger id="plan" className="w-full">
                      <SelectValue placeholder="Select a plan" />
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

            {/* Step 2: Public keys */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rpg-key">RPG public key</Label>
                  <Input
                    id="rpg-key"
                    placeholder="npub1... or hex public key"
                    value={rpgPublicKey}
                    onChange={(e) => setRpgPublicKey(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Public key for the PdR 125 channel (abuse/harassment
                    reports).
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="odv-key">OdV public key</Label>
                  <Input
                    id="odv-key"
                    placeholder="npub1... or hex public key"
                    value={odvPublicKey}
                    onChange={(e) => setOdvPublicKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Public key for the Whistleblowing channel (D.Lgs. 24/2023).
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Review and generate */}
            {step === 3 && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Organization
                  </p>
                  <p className="text-sm">{orgName}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Plan
                  </p>
                  <p className="text-sm capitalize">{plan}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    RPG public key
                  </p>
                  <p className="truncate text-sm font-mono">{rpgPublicKey}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    OdV public key
                  </p>
                  <p className="truncate text-sm font-mono">{odvPublicKey}</p>
                </div>
              </div>
            )}

            {/* Step 4: QR data display */}
            {step === 4 && qrData && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  The QR image rendering will be available in a future update.
                  Below is the pairing data in JSON format.
                </p>
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs font-mono">
                  {JSON.stringify(qrData, null, 2)}
                </pre>
                {orgId && (
                  <p className="text-xs text-muted-foreground">
                    Organization ID: <code className="font-mono">{orgId}</code>
                  </p>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            {step > 1 && step < 4 ? (
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
            ) : (
              <div />
            )}
            {step < 4 && (
              <Button
                onClick={handleNext}
                disabled={!canGoNext() || loading}
              >
                {loading
                  ? "Processing..."
                  : step === 3
                    ? "Generate QR"
                    : "Next"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
