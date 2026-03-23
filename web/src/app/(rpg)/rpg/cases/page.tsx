"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getReportsPaginated,
  exportRegistroPdf,
  exportSchedaDatiPdf,
  type ReportMetadata,
  type ReportStatusEnum,
  type PaginatedReports,
  type ReportListOptions,
} from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SkeletonPage } from "@/components/skeleton-page";
import { StatusBadge } from "@/components/status-badge";
import { SlaBadge } from "@/components/sla-badge";

const CHANNEL_LABEL: Record<string, string> = {
  PDR125: "PdR 125",
  WHISTLEBLOWING: "WB",
};

const STATUS_OPTIONS: { value: ReportStatusEnum; label: string }[] = [
  { value: "RECEIVED", label: "Ricevuta" },
  { value: "ACKNOWLEDGED", label: "Presa in carico" },
  { value: "INVESTIGATING", label: "Istruttoria" },
  { value: "RESPONSE_GIVEN", label: "Riscontro dato" },
  { value: "CLOSED_FOUNDED", label: "Fondata" },
  { value: "CLOSED_UNFOUNDED", label: "Infondata" },
  { value: "CLOSED_BAD_FAITH", label: "Mala fede" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isClosed(status: string): boolean {
  return status.startsWith("CLOSED_");
}

function closestDeadline(r: ReportMetadata): string | null {
  if (r.status === "RECEIVED" && r.slaAckDeadline) return r.slaAckDeadline;
  if (!isClosed(r.status) && r.slaResponseDeadline) return r.slaResponseDeadline;
  return r.slaAckDeadline ?? r.slaResponseDeadline;
}

function closestMet(r: ReportMetadata): boolean | null {
  if (isClosed(r.status)) {
    if (r.slaResponseMet !== null) return r.slaResponseMet;
    return r.slaAckMet;
  }
  return null;
}

export default function CasesPage() {
  const router = useRouter();
  const [user] = useState(() => getStoredUser());
  const orgId = user?.orgId;
  const dataLevel = user?.dataLevel;

  const [data, setData] = useState<PaginatedReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReportStatusEnum | "ALL">("ALL");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Guard: redirect on mount only
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const privileged = user && ["RPG", "ADMIN", "SUPER_ADMIN"].includes(user.role.toUpperCase());
    if (!privileged && (dataLevel == null || dataLevel >= 3)) {
      router.push("/rpg/dashboard");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch data when filters or page change
  useEffect(() => {
    if (!orgId) return;
    const currentOrgId = orgId;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const options: ReportListOptions = { page, limit: 20 };
        if (statusFilter !== "ALL") options.status = statusFilter;
        if (channelFilter !== "ALL") options.channel = channelFilter;
        if (dateFrom) options.date_from = new Date(dateFrom).toISOString();
        if (dateTo) options.date_to = new Date(dateTo + "T23:59:59").toISOString();
        const result = await getReportsPaginated(currentOrgId, options);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Errore nel caricamento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [orgId, statusFilter, channelFilter, dateFrom, dateTo, page]);

  async function handleExport(type: "registro" | "scheda-dati") {
    if (!orgId) return;
    setExporting(true);
    try {
      const fromIso = dateFrom ? new Date(dateFrom).toISOString() : undefined;
      const toIso = dateTo ? new Date(dateTo + "T23:59:59").toISOString() : undefined;

      let blob: Blob;
      let filename: string;
      if (type === "registro") {
        blob = await exportRegistroPdf(orgId, {
          from: fromIso,
          to: toIso,
          channel: channelFilter !== "ALL" ? channelFilter : undefined,
        });
        filename = "registro-segnalazioni.pdf";
      } else {
        blob = await exportSchedaDatiPdf(orgId, fromIso, toIso);
        filename = "scheda-dati-riesame.pdf";
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'esportazione");
    } finally {
      setExporting(false);
    }
  }

  const showIdentity = dataLevel === 0 || (user && ["RPG", "ADMIN", "SUPER_ADMIN"].includes(user.role.toUpperCase()));
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit ?? 20)));

  if (loading && !data) {
    return <SkeletonPage />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Segnalazioni"
          subtitle={`${total} segnalazioni`}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => handleExport("registro")}
          >
            <Download className="mr-2 h-4 w-4" />
            Registro PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => handleExport("scheda-dati")}
          >
            <FileText className="mr-2 h-4 w-4" />
            Scheda Dati
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter((v ?? "ALL") as ReportStatusEnum | "ALL"); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>
              {statusFilter === "ALL" ? "Tutti gli stati" : STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tutti gli stati</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={channelFilter}
          onValueChange={(v) => { setChannelFilter(v ?? "ALL"); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>
              {channelFilter === "ALL" ? "Tutti i canali" : CHANNEL_LABEL[channelFilter]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tutti i canali</SelectItem>
            <SelectItem value="PDR125">PdR 125</SelectItem>
            <SelectItem value="WHISTLEBLOWING">Whistleblowing</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="w-full sm:w-40"
          placeholder="Da"
          aria-label="Data da"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="w-full sm:w-40"
          placeholder="A"
          aria-label="Data a"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Canale</TableHead>
              <TableHead>Ricevuta il</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {total === 0
                    ? "Nessuna segnalazione ricevuta."
                    : "Nessun risultato per i filtri selezionati."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((report) => (
                <TableRow
                  key={report.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/rpg/cases/${report.id}`)}
                >
                  <TableCell>
                    <code className="text-xs">{report.id.slice(0, 8)}</code>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {report.category ?? <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CHANNEL_LABEL[report.channel] ?? report.channel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(report.receivedAt)}</TableCell>
                  <TableCell>
                    <SlaBadge
                      deadline={closestDeadline(report)}
                      met={closestMet(report)}
                      isClosed={isClosed(report.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Pagina {page} di {totalPages} &middot; {total} risultati
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
