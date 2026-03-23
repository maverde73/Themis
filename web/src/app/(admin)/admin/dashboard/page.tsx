"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { adminListOrganizations, type AdminOrganization } from "@/lib/api";

export default function AdminDashboardPage() {
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListOrganizations()
      .then(setOrgs)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organizzazioni"
        subtitle="Gestisci tutte le organizzazioni della piattaforma"
        actions={
          <Link href="/admin/organizations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuova organizzazione
            </Button>
          </Link>
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Caricamento...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Piano</TableHead>
                <TableHead className="text-right">Utenti</TableHead>
                <TableHead className="text-right">Moduli</TableHead>
                <TableHead>Creata il</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nessuna organizzazione trovata
                  </TableCell>
                </TableRow>
              ) : (
                orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="font-medium hover:underline"
                      >
                        {org.name}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{org.plan.toLowerCase()}</TableCell>
                    <TableCell className="text-right">{org._count.users}</TableCell>
                    <TableCell className="text-right">{org._count.surveys}</TableCell>
                    <TableCell>
                      {new Date(org.createdAt).toLocaleDateString("it-IT")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
