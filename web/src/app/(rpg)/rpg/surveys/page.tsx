"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Gavel, FileText, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
  getSurveys,
  createSurvey,
  updateSurvey,
  importTemplate,
  type Survey,
  type SurveyStatus,
  type FormKind,
  type FormChannel,
} from "@/lib/api";
import { getStoredUser, isAuthenticated } from "@/lib/auth";

// ── Constants ──────────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_BADGE: Record<SurveyStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Bozza", variant: "secondary" },
  ACTIVE: { label: "Attivo", variant: "default" },
  CLOSED: { label: "Chiuso", variant: "outline" },
  ARCHIVED: { label: "Archiviato", variant: "destructive" },
};

const KIND_BADGE: Record<FormKind, { label: string; variant: BadgeVariant }> = {
  SURVEY: { label: "Questionario", variant: "outline" },
  REPORT: { label: "Segnalazione", variant: "secondary" },
};

const CHANNEL_LABEL: Record<FormChannel, string> = {
  PDR125: "PdR 125",
  WHISTLEBLOWING: "Whistleblowing",
};

const TEMPLATE_CATALOG = [
  {
    id: "pdr125" as const,
    title: "Segnalazione Abusi e Molestie",
    description: "Modulo conforme UNI/PdR 125:2022",
    channel: "PDR125" as FormChannel,
    icon: Shield,
  },
  {
    id: "wb" as const,
    title: "Segnalazione Whistleblowing",
    description: "Modulo conforme D.Lgs. 24/2023",
    channel: "WHISTLEBLOWING" as FormChannel,
    icon: Gavel,
  },
];

const DEFAULT_SCHEMA = JSON.stringify(
  {
    title: { it: "", en: "" },
    questions: [
      {
        id: "q1",
        type: "text",
        label: { it: "Domanda", en: "Question" },
        required: true,
      },
    ],
  },
  null,
  2,
);

type FilterKind = "ALL" | "SURVEY" | "REPORT";

// ── Helpers ────────────────────────────────────────────────────────────

function statusBadge(status: SurveyStatus) {
  const cfg = STATUS_BADGE[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function kindBadge(kind: FormKind) {
  const cfg = KIND_BADGE[kind];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Page component ──────────────────────────────────────────────────────

export default function SurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<FilterKind>("ALL");

  // Create form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSchema, setFormSchema] = useState(DEFAULT_SCHEMA);
  const [formKind, setFormKind] = useState<FormKind>("SURVEY");
  const [formChannel, setFormChannel] = useState<FormChannel>("PDR125");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

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

  // ── Template import ────────────────────────────────────────────────

  async function handleImport(templateId: "pdr125" | "wb") {
    if (!orgId) return;
    setActionLoading(templateId);
    try {
      await importTemplate(orgId, templateId);
      await fetchSurveys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import template");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Create survey handler ─────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!orgId) return;

    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) {
      setFormError("Il titolo è obbligatorio");
      return;
    }

    let parsedSchema: Record<string, unknown>;
    try {
      parsedSchema = JSON.parse(formSchema);
    } catch {
      setFormError("Lo schema deve essere JSON valido");
      return;
    }

    setFormSubmitting(true);
    try {
      await createSurvey({
        orgId,
        title: trimmedTitle,
        description: formDescription.trim() || undefined,
        schema: parsedSchema,
        kind: formKind,
        channel: formKind === "REPORT" ? formChannel : undefined,
      });

      setFormTitle("");
      setFormDescription("");
      setFormSchema(DEFAULT_SCHEMA);
      setFormKind("SURVEY");
      setShowCreateForm(false);
      await fetchSurveys();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create survey");
    } finally {
      setFormSubmitting(false);
    }
  }

  // ── Status toggle ─────────────────────────────────────────────────

  async function handleStatusChange(id: string, status: SurveyStatus) {
    setActionLoading(id);
    try {
      await updateSurvey(id, { status });
      await fetchSurveys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update survey");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Filter ────────────────────────────────────────────────────────

  const filteredSurveys =
    filterKind === "ALL"
      ? surveys
      : surveys.filter((s) => s.kind === filterKind);

  const activeCount = surveys.filter((s) => s.status === "ACTIVE").length;

  // ── Check if template already imported ────────────────────────────

  function isTemplateImported(channel: FormChannel) {
    return surveys.some((s) => s.kind === "REPORT" && s.channel === channel);
  }

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Caricamento moduli...</p>
      </main>
    );
  }

  if (error && surveys.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Moduli</h2>
          <p className="text-sm text-muted-foreground">
            {surveys.length} moduli &middot; {activeCount} attivi
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm((prev) => !prev)}
          variant={showCreateForm ? "outline" : "default"}
        >
          {showCreateForm ? "Annulla" : "Nuovo modulo"}
        </Button>
      </div>

      {/* Inline error banner */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Template catalog ────────────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Catalogo template
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {TEMPLATE_CATALOG.map((tpl) => {
            const imported = isTemplateImported(tpl.channel);
            const Icon = tpl.icon;
            const isLoading = actionLoading === tpl.id;
            return (
              <Card key={tpl.id} className="flex flex-col">
                <CardHeader className="flex-row items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{tpl.title}</CardTitle>
                    <CardDescription>{tpl.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardFooter className="mt-auto">
                  {imported ? (
                    <Badge variant="outline" className="gap-1.5">
                      <FileText className="h-3 w-3" />
                      Già importato
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleImport(tpl.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? "Importazione..." : "Importa"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Create form ─────────────────────────────────────────────── */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nuovo modulo</CardTitle>
            <CardDescription>
              Definisci titolo, tipo e schema JSON del modulo.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="survey-title">Titolo *</Label>
                <Input
                  id="survey-title"
                  placeholder="es. Clima aziendale 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="survey-description">Descrizione</Label>
                <textarea
                  id="survey-description"
                  className="min-h-[60px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  placeholder="Descrizione opzionale"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={formKind}
                    onValueChange={(v) => setFormKind(v as FormKind)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SURVEY">Questionario</SelectItem>
                      <SelectItem value="REPORT">Segnalazione</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formKind === "REPORT" && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Canale</Label>
                    <Select
                      value={formChannel}
                      onValueChange={(v) => setFormChannel(v as FormChannel)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PDR125">PdR 125</SelectItem>
                        <SelectItem value="WHISTLEBLOWING">
                          Whistleblowing
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="survey-schema">Schema (JSON)</Label>
                <textarea
                  id="survey-schema"
                  className="min-h-[200px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  value={formSchema}
                  onChange={(e) => setFormSchema(e.target.value)}
                  rows={10}
                  spellCheck={false}
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting ? "Creazione..." : "Crea modulo"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Annulla
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* ── Filter tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {(["ALL", "SURVEY", "REPORT"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filterKind === f ? "default" : "outline"}
            onClick={() => setFilterKind(f)}
          >
            {f === "ALL" ? "Tutti" : f === "SURVEY" ? "Questionari" : "Segnalazioni"}
          </Button>
        ))}
      </div>

      {/* ── Survey list ─────────────────────────────────────────────── */}
      {filteredSurveys.length === 0 && !showCreateForm ? (
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle>Nessun modulo</CardTitle>
            <CardDescription>
              {filterKind === "ALL"
                ? "Importa un template o crea un modulo da zero."
                : "Nessun modulo per questo filtro."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSurveys.map((survey) => {
            const isActionLoading = actionLoading === survey.id;
            return (
              <Card key={survey.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="leading-snug">
                      {survey.title}
                    </CardTitle>
                    {statusBadge(survey.status)}
                  </div>
                  {survey.description && (
                    <CardDescription className="line-clamp-2">
                      {survey.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {kindBadge(survey.kind)}
                    {survey.channel && (
                      <Badge variant="outline">
                        {CHANNEL_LABEL[survey.channel]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>v{survey.version}</span>
                    <span>
                      {survey.responseCount} rispost
                      {survey.responseCount !== 1 ? "e" : "a"}
                    </span>
                    <span>{formatDate(survey.createdAt)}</span>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto gap-2 flex-wrap">
                  {/* Activate / Deactivate toggle */}
                  {(survey.status === "DRAFT" || survey.status === "CLOSED") && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(survey.id, "ACTIVE")}
                      disabled={isActionLoading}
                    >
                      Attiva
                    </Button>
                  )}
                  {survey.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(survey.id, "CLOSED")}
                      disabled={isActionLoading}
                    >
                      Disattiva
                    </Button>
                  )}

                  {/* Edit */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      router.push(
                        `/rpg/surveys/edit?surveyId=${survey.id}`,
                      )
                    }
                  >
                    Modifica
                  </Button>

                  {/* Results */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      router.push(
                        `/rpg/surveys/results?surveyId=${survey.id}`,
                      )
                    }
                  >
                    Risultati
                  </Button>

                  {/* Archive */}
                  {survey.status !== "ARCHIVED" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        handleStatusChange(survey.id, "ARCHIVED")
                      }
                      disabled={isActionLoading}
                    >
                      Archivia
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
