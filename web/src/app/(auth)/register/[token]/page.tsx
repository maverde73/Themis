"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { getInviteInfo, registerViaInvite, saveKeyBlob, type InviteInfo } from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { generateKeypair, encryptPrivateKey } from "@/lib/crypto/keypair";
import { cacheKeypair } from "@/lib/crypto/key-sync";

export default function RegisterPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getInviteInfo(params.token)
      .then((info) => {
        setInvite(info);
        if (info.email) setEmail(info.email);
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Invalid invite"),
      );
  }, [params.token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await registerViaInvite(
        params.token,
        email,
        password,
      );
      setAuth(token, user);
      const role = user.role.toUpperCase();

      // RPG/ODV users need full keypair setup (masterKey + Shamir)
      if (role === "RPG" || role === "ODV") {
        router.push("/rpg/setup/keypair");
        return;
      }

      // Users with OrgRole generate lightweight keypair (no Shamir)
      // and wait for RPG approval to get their level key
      const hasOrgRole = invite?.orgRoleId;
      if (hasOrgRole) {
        try {
          const kp = await generateKeypair();
          const blob = await encryptPrivateKey(kp.x25519Priv, password);
          await saveKeyBlob(JSON.stringify(blob), kp.x25519Pub);
          await cacheKeypair({ x25519Priv: kp.x25519Priv, x25519Pub: kp.x25519Pub });
        } catch {
          // Non-fatal: user can retry keypair generation later
        }
        router.push("/rpg/setup/pending");
        return;
      }

      // TECHNICAL without OrgRole → direct to surveys
      // SUPER_ADMIN → admin dashboard
      const dest = role === "SUPER_ADMIN" ? "/admin/dashboard" : "/rpg/surveys";
      router.push(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Invito non valido</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Registrazione</CardTitle>
          <CardDescription>
            Sei stato invitato come <strong className="uppercase">{invite.role}</strong> per{" "}
            <strong>{invite.orgName}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!invite.email}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Conferma password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Registrazione..." : "Registrati"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
