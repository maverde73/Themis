"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, FileText, Copy, Link, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSurveys,
  createSurvey,
  deleteSurvey,
  importTemplate,
  listTemplates,
  type Survey,
  type SurveyStatus,
  type FormChannel,
  type TemplateCatalogEntry,
} from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SkeletonPage } from "@/components/skeleton-page";

// ── Constants ──────────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_BADGE: Record<SurveyStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Bozza", variant: "secondary" },
  ACTIVE: { label: "Attivo", variant: "default" },
  CLOSED: { label: "Chiuso", variant: "outline" },
  ARCHIVED: { label: "Archiviato", variant: "destructive" },
};

const CHANNEL_LABEL: Record<FormChannel, string> = {
  PDR125: "PdR 125",
  WHISTLEBLOWING: "Whistleblowing",
};

const DEFAULT_SCHEMA = {
  title: { it: "", en: "" },
  questions: [
    {
      id: "q1",
      type: "text",
      label: { it: "Domanda", en: "Question" },
      required: true,
    },
  ],
};

const PAGE_SIZE = 10;

// ── Helpers ────────────────────────────────────────────────────────────

function statusBadge(status: SurveyStatus) {
  const cfg = STATUS_BADGE[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function channelBadge(channel: FormChannel | null) {
  if (!channel) return <span className="text-muted-foreground">-</span>;
  return <Badge variant="outline">{CHANNEL_LABEL[channel]}</Badge>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Types ──────────────────────────────────────────────────────────────

type SortField = "title" | "status" | "createdAt" | "responseCount";
type SortDirection = "asc" | "desc";

// ── Page component ──────────────────────────────────────────────────────

export default function SurveysPage() {
  const router = useRouter();

  // Data
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | "ALL">("ALL");
  const [channelFilter, setChannelFilter] = useState<FormChannel | "ALL">("ALL");

  // Sort
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Actions
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Link copy
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New module sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<"choose" | "templates">("choose");
  const [templates, setTemplates] = useState<TemplateCatalogEntry[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState<string | null>(null);

  const user = getStoredUser();
  const orgId = user?.orgId;

  const fetchSurveys = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSurveys(orgId);
      setSurveys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch surveys");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchSurveys();
  }, [router, fetchSurveys]);

  // ── Filter + Sort + Paginate ────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = surveys;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) => s.title.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Channel filter
    if (channelFilter !== "ALL") {
      result = result.filter((s) => s.channel === channelFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title, "it");
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "responseCount":
          cmp = a.responseCount - b.responseCount;
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [surveys, searchQuery, statusFilter, channelFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, channelFilter]);

  // ── Actions ─────────────────────────────────────────────────────────

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDirection === "asc"
      ? <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
      : <ArrowDown className="ml-1 inline h-3.5 w-3.5" />;
  }

  function openNewSheet() {
    setSheetStep("choose");
    setSheetOpen(true);
  }

  async function handleBlankCreate() {
    if (!orgId) return;
    setCreating(true);
    setSheetOpen(false);
    try {
      const created = await createSurvey({
        orgId,
        title: "Nuovo modulo",
        schema: DEFAULT_SCHEMA,
      });
      router.push(`/rpg/surveys/edit?surveyId=${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella creazione");
      setCreating(false);
    }
  }

  async function handleShowTemplates() {
    setSheetStep("templates");
    if (templates.length === 0) {
      setTemplatesLoading(true);
      try {
        const data = await listTemplates();
        setTemplates(data);
      } catch {
        setError("Errore nel caricamento dei template");
      } finally {
        setTemplatesLoading(false);
      }
    }
  }

  async function handleImportTemplate(templateId: string) {
    if (!orgId) return;
    setImportingTemplate(templateId);
    try {
      const created = await importTemplate(orgId, templateId);
      setSheetOpen(false);
      if (created.length > 0) {
        router.push(`/rpg/surveys/edit?surveyId=${created[0].id}`);
      } else {
        await fetchSurveys();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'importazione");
    } finally {
      setImportingTemplate(null);
    }
  }

  async function handleCopyFormLink(surveyId: string) {
    const url = `${window.location.origin}/s/${surveyId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(surveyId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(survey: Survey) {
    if (!confirm(`Eliminare "${survey.title}"? Questa azione non è reversibile.`)) return;
    setDeleting(survey.id);
    try {
      await deleteSurvey(survey.id);
      setSurveys((prev) => prev.filter((s) => s.id !== survey.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'eliminazione");
    } finally {
      setDeleting(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return <SkeletonPage />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title="Moduli"
        subtitle={`${surveys.length} moduli \u00b7 ${surveys.filter((s) => s.status === "ACTIVE").length} attivi`}
        actions={
          <Button onClick={openNewSheet} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Creazione..." : "Nuovo modulo"}
          </Button>
        }
      />

      {/* New module sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          {sheetStep === "choose" ? (
            <>
              <SheetHeader>
                <SheetTitle>Nuovo modulo</SheetTitle>
                <SheetDescription>
                  Scegli come creare il nuovo modulo.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 p-6">
                <button
                  type="button"
                  className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                  onClick={handleBlankCreate}
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Modulo vuoto</p>
                    <p className="text-sm text-muted-foreground">
                      Crea da zero e usa l&apos;assistente AI per compilarlo.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                  onClick={handleShowTemplates}
                >
                  <Copy className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Da template</p>
                    <p className="text-sm text-muted-foreground">
                      Parti da un modello predefinito e personalizzalo.
                    </p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Scegli un template</SheetTitle>
                <SheetDescription>
                  Seleziona un modello da cui partire.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 p-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-auto"
                  onClick={() => setSheetStep("choose")}
                >
                  &larr; Indietro
                </Button>
                {templatesLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Caricamento template...
                  </p>
                ) : templates.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nessun template disponibile.
                  </p>
                ) : (
                  templates.map((tpl) => {
                    const isImporting = importingTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        className="flex items-start gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                        onClick={() => handleImportTemplate(tpl.id)}
                        disabled={isImporting || importingTemplate !== null}
                      >
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {tpl.catalogTitle.it ?? tpl.catalogTitle.en}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {tpl.catalogDescription.it ?? tpl.catalogDescription.en}
                          </p>
                          {tpl.channel && (
                            <Badge variant="outline" className="mt-2">
                              {CHANNEL_LABEL[tpl.channel as FormChannel] ?? tpl.channel}
                            </Badge>
                          )}
                        </div>
                        {isImporting && (
                          <span className="text-xs text-muted-foreground">Importazione...</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Cerca per titolo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as SurveyStatus | "ALL")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue>
              {statusFilter === "ALL" ? "Tutti gli stati" : STATUS_BADGE[statusFilter].label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tutti gli stati</SelectItem>
            <SelectItem value="DRAFT">Bozza</SelectItem>
            <SelectItem value="ACTIVE">Attivo</SelectItem>
            <SelectItem value="CLOSED">Chiuso</SelectItem>
            <SelectItem value="ARCHIVED">Archiviato</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={channelFilter}
          onValueChange={(v) => setChannelFilter(v as FormChannel | "ALL")}
        >
          <SelectTrigger className="w-full sm:w-48">
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" className="inline-flex items-center font-medium" onClick={() => handleSort("title")}>
                  Titolo <SortIcon field="title" />
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="inline-flex items-center font-medium" onClick={() => handleSort("status")}>
                  Stato <SortIcon field="status" />
                </button>
              </TableHead>
              <TableHead>Canale</TableHead>
              <TableHead className="text-center">Versione</TableHead>
              <TableHead>
                <button type="button" className="inline-flex items-center font-medium" onClick={() => handleSort("responseCount")}>
                  Risposte <SortIcon field="responseCount" />
                </button>
              </TableHead>
              <TableHead>
                <button type="button" className="inline-flex items-center font-medium" onClick={() => handleSort("createdAt")}>
                  Data <SortIcon field="createdAt" />
                </button>
              </TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {surveys.length === 0
                    ? "Nessun modulo. Crea il primo con il bottone \"Nuovo modulo\"."
                    : "Nessun risultato per i filtri selezionati."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((survey) => (
                <TableRow key={survey.id} className="group">
                  <TableCell className="font-medium">{survey.title}</TableCell>
                  <TableCell>{statusBadge(survey.status)}</TableCell>
                  <TableCell>{channelBadge(survey.channel)}</TableCell>
                  <TableCell className="text-center">v{survey.version}</TableCell>
                  <TableCell>{survey.responseCount}</TableCell>
                  <TableCell>{formatDate(survey.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {survey.status === "ACTIVE" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleCopyFormLink(survey.id)}
                          title="Copia link form"
                        >
                          {copiedId === survey.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Link className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => router.push(`/rpg/surveys/edit?surveyId=${survey.id}`)}
                        title="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(survey)}
                        disabled={deleting === survey.id}
                        title="Elimina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            Pagina {safePage} di {totalPages} &middot; {filtered.length} risultati
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
