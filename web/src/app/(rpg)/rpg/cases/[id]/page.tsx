"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getReportDetail,
  updateReportStatus,
  type ReportMetadataDetail,
  type ReportStatusEnum,
} from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { StatusBadge, getStatusLabel } from "@/components/status-badge";
import { CaseTimeline } from "@/components/case-timeline";
import { SlaProgressCard } from "@/components/sla-progress-card";
import { SkeletonPage } from "@/components/skeleton-page";
import { CaseContent } from "@/components/case-content";

const CHANNEL_LABEL: Record<string, string> = {
  PDR125: "PdR 125",
  WHISTLEBLOWING: "Whistleblowing",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [user] = useState(() => getStoredUser());
  const dataLevel = user?.dataLevel;
  const isPrivileged = user && ["RPG", "ADMIN", "SUPER_ADMIN"].includes(user.role.toUpperCase());
  const canAdvance = dataLevel === 0 || isPrivileged;
  const canSeeIdentity = dataLevel === 0 || isPrivileged;

  const [report, setReport] = useState<ReportMetadataDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  // Single next status for confirm dialog
  const [confirmStatus, setConfirmStatus] = useState<ReportStatusEnum | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReportDetail(id);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (!isPrivileged && (dataLevel == null || dataLevel >= 3)) {
      router.push("/rpg/dashboard");
      return;
    }
    fetchReport();
  }, [fetchReport]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdvanceStatus(nextStatus: ReportStatusEnum) {
    setAdvancing(true);
    setConfirmStatus(null);
    try {
      await updateReportStatus(id, nextStatus);
      await fetchReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'aggiornamento");
    } finally {
      setAdvancing(false);
    }
  }

  if (loading && !report) {
    return <SkeletonPage />;
  }

  if (error && !report) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/rpg/cases")} className="mr-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla lista
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const nextStatuses = report.validNextStatuses;
  const hasMultipleNext = nextStatuses.length > 1;
  const hasSingleNext = nextStatuses.length === 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/rpg/cases")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              Segnalazione #{report.id.slice(0, 8)}
            </h1>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{CHANNEL_LABEL[report.channel] ?? report.channel}</Badge>
              <span>{formatDate(report.receivedAt)}</span>
            </div>
          </div>
        </div>

        {/* Advance status action */}
        {canAdvance && nextStatuses.length > 0 && (
          <div>
            {hasSingleNext && (
              <Button
                disabled={advancing}
                onClick={() => setConfirmStatus(nextStatuses[0])}
              >
                {advancing ? "Aggiornamento..." : `Passa a ${getStatusLabel(nextStatuses[0])}`}
              </Button>
            )}

            {hasMultipleNext && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={advancing}
                  render={<Button>{advancing ? "Aggiornamento..." : "Avanza stato"}<ChevronDown className="ml-2 h-4 w-4" /></Button>}
                />
                <DropdownMenuContent align="end">
                  {nextStatuses.map((ns) => (
                    <DropdownMenuItem
                      key={ns}
                      onClick={() => setConfirmStatus(ns)}
                    >
                      {getStatusLabel(ns)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Confirm dialog */}
            <AlertDialog open={!!confirmStatus} onOpenChange={(open) => { if (!open) setConfirmStatus(null); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma avanzamento</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vuoi passare lo stato a <strong>{confirmStatus ? getStatusLabel(confirmStatus) : ""}</strong>? Questa azione non è reversibile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={() => confirmStatus && handleAdvanceStatus(confirmStatus)}>
                    Conferma
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          <CaseTimeline currentStatus={report.status} />
        </CardContent>
      </Card>

      {/* SLA cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SlaProgressCard
          title="SLA Presa in carico"
          deadline={report.slaAckDeadline}
          met={report.slaAckMet}
          startDate={report.receivedAt}
        />
        <SlaProgressCard
          title="SLA Riscontro finale"
          deadline={report.slaResponseDeadline}
          met={report.slaResponseMet}
          startDate={report.receivedAt}
        />
      </div>

      {/* Encrypted content */}
      <CaseContent
        reportReceivedAt={report.receivedAt}
        orgId={report.orgId}
        nostrPubkey={report.nostrPubkey ?? null}
        canDecrypt={!!canSeeIdentity}
      />

      {/* Metadata details */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stato</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={report.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canale</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{CHANNEL_LABEL[report.channel] ?? report.channel}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{report.category ?? <span className="text-muted-foreground">Non classificata</span>}</p>
          </CardContent>
        </Card>

        {canSeeIdentity && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Identità rivelata</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {report.identityRevealed === null
                  ? "Non specificato"
                  : report.identityRevealed
                    ? "Sì"
                    : "Anonima"}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Allegati</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {report.hasAttachments === null
                ? "Non specificato"
                : report.hasAttachments
                  ? "Sì"
                  : "No"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cronologia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs"><span className="text-muted-foreground">Ricevuta:</span> {formatDate(report.receivedAt)}</p>
            {report.acknowledgedAt && <p className="text-xs"><span className="text-muted-foreground">Presa in carico:</span> {formatDate(report.acknowledgedAt)}</p>}
            {report.responseGivenAt && <p className="text-xs"><span className="text-muted-foreground">Riscontro:</span> {formatDate(report.responseGivenAt)}</p>}
            {report.closedAt && <p className="text-xs"><span className="text-muted-foreground">Chiusa:</span> {formatDate(report.closedAt)}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
