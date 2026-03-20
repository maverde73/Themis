"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getReports, type ReportMetadata } from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";

// ── Status → badge variant mapping ────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> =
  {
    RECEIVED: { label: "Received", variant: "secondary" },
    ACKNOWLEDGED: { label: "Acknowledged", variant: "default" },
    INVESTIGATING: { label: "Investigating", variant: "default" },
    RESPONSE_GIVEN: { label: "Response Given", variant: "default" },
    CLOSED_FOUNDED: { label: "Closed (Founded)", variant: "outline" },
    CLOSED_UNFOUNDED: { label: "Closed (Unfounded)", variant: "outline" },
    CLOSED_BAD_FAITH: { label: "Closed (Bad Faith)", variant: "destructive" },
  };

function statusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "outline" as const,
  };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

// ── SLA helpers ────────────────────────────────────────────────────────

function slaStatus(deadline: string | null): {
  label: string;
  variant: BadgeVariant;
} {
  if (!deadline) return { label: "N/A", variant: "outline" };

  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const daysLeft = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: "Overdue", variant: "destructive" };
  if (daysLeft <= 3) return { label: `${daysLeft}d left`, variant: "destructive" };
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, variant: "secondary" };
  return { label: `${daysLeft}d left`, variant: "outline" };
}

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Page component ─────────────────────────────────────────────────────

export default function RpgDashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    const user = getStoredUser();
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getReports(user.orgId, "PDR125");
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchReports();
  }, [router, fetchReports]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Loading reports...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (reports.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No reports yet</CardTitle>
            <CardDescription>
              PdR 125 reports will appear here when received.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">PdR 125 Reports</h2>
          <p className="text-sm text-muted-foreground">
            {reports.length} report{reports.length !== 1 ? "s" : ""} — metadata only
          </p>
        </div>
      </div>

      {/* Manager App required for content */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-3">
          <span className="text-lg" aria-hidden="true">
            &#128274;
          </span>
          <p className="text-sm text-muted-foreground">
            Report content is end-to-end encrypted. Connect your <strong>Manager App</strong> to view report details.
          </p>
        </CardContent>
      </Card>

      {/* Metadata-only table: no category, no identity — those require decryption */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>SLA Ack</TableHead>
              <TableHead>SLA Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => {
              const ackSla = slaStatus(report.slaAckDeadline ?? null);
              const respSla = slaStatus(report.slaResponseDeadline ?? null);
              return (
                <TableRow key={report.id}>
                  <TableCell className="font-mono text-xs">
                    {truncateId(report.id)}
                  </TableCell>
                  <TableCell>{statusBadge(report.status)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(report.receivedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ackSla.variant}>{ackSla.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={respSla.variant}>{respSla.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
