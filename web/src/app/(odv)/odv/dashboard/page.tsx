"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonPage } from "@/components/skeleton-page";
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

// ── Column definitions ──────────────────────────────────────────────────

const columns: DataTableColumn<ReportMetadata>[] = [
  {
    key: "id",
    header: "ID",
    className: "w-32",
    render: (row) => (
      <span className="font-mono text-xs">{truncateId(row.id)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => statusBadge(row.status),
  },
  {
    key: "receivedAt",
    header: "Received",
    sortable: true,
    render: (row) => (
      <span className="text-sm">{formatDate(row.receivedAt)}</span>
    ),
  },
  {
    key: "slaAck",
    header: "SLA Ack",
    render: (row) => {
      const sla = slaStatus(row.slaAckDeadline ?? null);
      return <Badge variant={sla.variant}>{sla.label}</Badge>;
    },
  },
  {
    key: "slaResponse",
    header: "SLA Response",
    render: (row) => {
      const sla = slaStatus(row.slaResponseDeadline ?? null);
      return <Badge variant={sla.variant}>{sla.label}</Badge>;
    },
  },
];

// ── Page component ─────────────────────────────────────────────────────

export default function OdvDashboardPage() {
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
      const data = await getReports(user.orgId!, "WHISTLEBLOWING");
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
    return <SkeletonPage />;
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="OdV Dashboard — Whistleblowing"
          subtitle="0 reports — metadata only | SLA: 7 days acknowledgement, 90 days response (D.Lgs. 24/2023)"
        />
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          title="No reports yet"
          description="Whistleblowing reports will appear here when received."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="OdV Dashboard — Whistleblowing"
        subtitle={`${reports.length} report${reports.length !== 1 ? "s" : ""} — metadata only | SLA: 7 days acknowledgement, 90 days response (D.Lgs. 24/2023)`}
      />

      {/* Manager App required for content */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-3 py-3">
          <span className="text-lg" aria-hidden="true">
            &#128274;
          </span>
          <p className="text-sm text-muted-foreground">
            Report content is end-to-end encrypted. Connect your <strong>Manager App</strong> to view report details, identity information, and attachments.
          </p>
        </CardContent>
      </Card>

      {/* Reports table */}
      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={reports}
          keyExtractor={(r) => r.id}
        />
      </div>
    </div>
  );
}
