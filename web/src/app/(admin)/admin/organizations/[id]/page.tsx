"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  adminGetOrganization,
  createInvite,
  type AdminOrganizationDetail,
} from "@/lib/api";

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const [org, setOrg] = useState<AdminOrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteRole, setInviteRole] = useState("rpg");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    adminGetOrganization(params.id)
      .then(setOrg)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleInvite() {
    setInviteLoading(true);
    setInviteLink(null);
    try {
      const invite = await createInvite(
        params.id,
        inviteRole,
        inviteEmail || undefined,
      );
      const link = `${window.location.origin}/register/${invite.token}`;
      setInviteLink(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Caricamento...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!org) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={org.name}
        subtitle={`Piano: ${org.plan.toLowerCase()} — ${org._count.surveys} moduli, ${org._count.reportMetadata} segnalazioni`}
      />

      {/* Invite section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invita utente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-role" className="text-sm font-medium">Ruolo</label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="rpg">RPG</option>
                <option value="odv">OdV</option>
                <option value="technical">Tecnico</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium">Email (opzionale)</label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="utente@example.com"
                className="flex h-10 w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading ? "Creazione..." : "Crea invito"}
            </Button>
          </div>

          {inviteLink && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
              <code className="flex-1 truncate text-xs">{inviteLink}</code>
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Utenti ({org.users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {org.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun utente registrato</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Registrato il</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="uppercase text-xs font-medium">{user.role}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString("it-IT")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
