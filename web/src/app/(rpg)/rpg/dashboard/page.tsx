"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getStoredUser } from "@/lib/auth";
import {
  getSurveys,
  getSurveyResults,
  getDashboards,
  getDashboardData,
  getDashboardTemplates,
  importDashboardTemplate,
  type Survey,
  type SurveyResults,
  type DashboardWithData,
  type DashboardTemplateData,
} from "@/lib/api";
import { DashboardRenderer } from "@/components/dashboard-renderer";
import { SurveyResultsView } from "@/components/survey-results-view";
import { PageHeader } from "@/components/page-header";
import { SkeletonPage } from "@/components/skeleton-page";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ViewData =
  | { type: "pdr125"; dashboard: DashboardWithData }
  | { type: "pdr125-no-dashboard"; templates: DashboardTemplateData[] }
  | { type: "generic"; results: SurveyResults };

export default function RpgDashboardPage() {
  const router = useRouter();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [viewData, setViewData] = useState<ViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, ViewData>>(new Map());
  const userRef = useRef<{ orgId: string; dataLevel: number | null } | null>(null);

  // Load active surveys on mount
  useEffect(() => {
    const user = getStoredUser();
    if (!user?.orgId) {
      router.replace("/login");
      return;
    }
    if (user.dataLevel == null) {
      router.replace("/rpg/surveys");
      return;
    }
    userRef.current = { orgId: user.orgId, dataLevel: user.dataLevel };

    getSurveys(user.orgId)
      .then((all) => {
        const active = all.filter((s) => s.status === "ACTIVE");
        setSurveys(active);

        // Auto-select: prefer first PDR125, then first generic
        const pdr = active.find((s) => s.channel === "PDR125");
        const first = pdr ?? active[0];
        if (first) {
          setSelectedId(first.id);
        }
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load surveys"),
      )
      .finally(() => setLoading(false));
  }, [router]);

  // Load view data when selection changes
  const loadViewData = useCallback(
    async (survey: Survey) => {
      const user = userRef.current;
      if (!user) return;

      // Check cache
      const cached = cacheRef.current.get(survey.id);
      if (cached) {
        setViewData(cached);
        return;
      }

      setViewLoading(true);
      setError(null);

      try {
        let data: ViewData;

        if (survey.channel === "PDR125") {
          const dashboards = await getDashboards(user.orgId);
          const defaultDb = dashboards.find((d) => d.isDefault) || dashboards[0];

          if (!defaultDb) {
            const tpls = await getDashboardTemplates();
            data = { type: "pdr125-no-dashboard", templates: tpls };
          } else {
            const withData = await getDashboardData(defaultDb.id, user.dataLevel ?? 0);
            data = { type: "pdr125", dashboard: withData };
          }
        } else {
          const results = await getSurveyResults(survey.id);
          data = { type: "generic", results };
        }

        cacheRef.current.set(survey.id, data);
        setViewData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setViewLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedId || surveys.length === 0) return;
    const survey = surveys.find((s) => s.id === selectedId);
    if (survey) loadViewData(survey);
  }, [selectedId, surveys, loadViewData]);

  async function handleImport(templateId: string) {
    const user = userRef.current;
    if (!user) return;

    try {
      setImporting(true);
      await importDashboardTemplate(user.orgId, templateId);
      // Clear cache for this survey and reload
      cacheRef.current.delete(selectedId);
      const survey = surveys.find((s) => s.id === selectedId);
      if (survey) await loadViewData(survey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'importazione");
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <SkeletonPage rows={4} />;

  const selectedSurvey = surveys.find((s) => s.id === selectedId);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={selectedSurvey?.title ?? ""}
        className="mb-6"
        actions={
          surveys.length > 0 ? (
            <Select value={selectedId} onValueChange={(v) => { if (v) setSelectedId(v); }}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Seleziona modulo...">
                  {selectedSurvey && (
                    <span className="flex items-center gap-2">
                      {selectedSurvey.channel === "PDR125" && (
                        <Badge variant="outline" className="text-[10px]">PdR 125</Badge>
                      )}
                      <span className="truncate">{selectedSurvey.title}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {surveys.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      {s.channel === "PDR125" && (
                        <Badge variant="outline" className="text-[10px]">
                          PdR 125
                        </Badge>
                      )}
                      <span className="truncate">{s.title}</span>
                      {s.responseCount > 0 && (
                        <span className="text-muted-foreground text-xs">
                          ({s.responseCount})
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-6">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {viewLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!viewLoading && surveys.length === 0 && (
        <EmptyState
          title="Nessun modulo attivo"
          description="Crea e attiva un modulo per visualizzare i risultati nella dashboard."
          action={
            <Button variant="outline" onClick={() => router.push("/rpg/surveys")}>
              Vai ai moduli
            </Button>
          }
        />
      )}

      {!viewLoading && viewData?.type === "pdr125" && (
        <DashboardRenderer dashboard={viewData.dashboard} />
      )}

      {!viewLoading && viewData?.type === "pdr125-no-dashboard" && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Nessun cruscotto configurato per questa organizzazione.
          </p>
          {viewData.templates.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
              {viewData.templates.map((t) => (
                <Button
                  key={t.id}
                  onClick={() => handleImport(t.id)}
                  disabled={importing}
                >
                  {importing
                    ? "Importazione..."
                    : `Importa "${t.catalogTitle.it || t.catalogTitle.en || t.slug}"`}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun template disponibile.</p>
          )}
        </div>
      )}

      {!viewLoading && viewData?.type === "generic" && (
        <SurveyResultsView results={viewData.results} />
      )}
    </div>
  );
}
