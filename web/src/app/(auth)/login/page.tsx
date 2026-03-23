"use client";

import { useState, type FormEvent } from "react";
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
import { login, type KeyBlobData } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { checkKeySyncNeeded, syncKeyFromServer, syncLevelKey } from "@/lib/crypto/key-sync";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Key sync state
  const [keySyncNeeded, setKeySyncNeeded] = useState<KeyBlobData | null>(null);
  const [keySyncPassword, setKeySyncPassword] = useState("");
  const [keySyncLoading, setKeySyncLoading] = useState(false);
  const [keySyncError, setKeySyncError] = useState<string | null>(null);
  const [pendingDest, setPendingDest] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { token, user } = await login(email, password);
      setAuth(token, user);
      const role = user.role.toUpperCase();
      // TECHNICAL users with no dataLevel go to surveys, others to dashboard
      const rpgDest = role === "TECHNICAL" && user.dataLevel == null
        ? "/rpg/surveys"
        : "/rpg/dashboard";
      const dest =
        role === "SUPER_ADMIN"
          ? "/admin/dashboard"
          : role === "ODV"
            ? "/odv/dashboard"
            : rpgDest;

      // Check if key sync is needed for RPG/ODV
      if (role === "RPG" || role === "ODV") {
        const syncData = await checkKeySyncNeeded();
        if (syncData) {
          setPendingDest(dest);
          setKeySyncNeeded(syncData);
          setKeySyncPassword(password);
          // Try auto-sync with login password first
          try {
            await syncKeyFromServer(
              syncData.encryptedKeyBlob!,
              syncData.nostrPubkey!,
              password,
            );
            router.push(dest);
            return;
          } catch {
            // Login password differs from encryption password — show prompt
            setKeySyncPassword("");
            setLoading(false);
            return;
          }
        }
      }

      // Sync level key for approved users with orgRole
      if (user.encryptedLevelKey && user.dataLevel != null) {
        try {
          await syncLevelKey(user.encryptedLevelKey, user.dataLevel);
        } catch {
          // Non-fatal: will retry next login
        }
      }

      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleKeySync(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setKeySyncError(null);
    setKeySyncLoading(true);

    try {
      await syncKeyFromServer(
        keySyncNeeded!.encryptedKeyBlob!,
        keySyncNeeded!.nostrPubkey!,
        keySyncPassword,
      );
      router.push(pendingDest);
    } catch {
      setKeySyncError("Password non corretta. Riprova.");
    } finally {
      setKeySyncLoading(false);
    }
  }

  function handleSkipSync() {
    router.push(pendingDest);
  }

  // Show key sync prompt
  if (keySyncNeeded) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Sblocca chiavi</CardTitle>
            <CardDescription>
              Le tue chiavi crittografiche sono state trovate sul server.
              Inserisci la password di crittografia per sincronizzarle su questo dispositivo.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleKeySync} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sync-password">Password crittografia</Label>
                <Input
                  id="sync-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={keySyncPassword}
                  onChange={(e) => setKeySyncPassword(e.target.value)}
                />
              </div>

              {keySyncError && (
                <p role="alert" className="text-sm text-destructive">
                  {keySyncError}
                </p>
              )}

              <Button type="submit" disabled={keySyncLoading} className="mt-2">
                {keySyncLoading ? "Sincronizzazione..." : "Sincronizza chiavi"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkipSync}
                className="text-sm text-muted-foreground"
              >
                Salta (non potrai decrittare i dati)
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">FidesVox</CardTitle>
          <CardDescription>
            Accedi alla piattaforma FidesVox
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
