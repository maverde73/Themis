"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";
import {
  getDashboards,
  getDashboardData,
  getDashboardTemplates,
  importDashboardTemplate,
  type DashboardWithData,
  type DashboardTemplateData,
} from "@/lib/api";
import { DashboardRenderer } from "@/components/dashboard-renderer";
import { PageHeader } from "@/components/page-header";
import { SkeletonPage } from "@/components/skeleton-page";
import { Button } from "@/components/ui/button";

export default function RpgAnalyticsPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardWithData | null>(null);
  const [templates, setTemplates] = useState<DashboardTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDashboard, setNoDashboard] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user?.orgId) {
      router.replace("/login");
      return;
    }

    // TECHNICAL users have no dataLevel — redirect
    if (user.dataLevel == null) {
      router.replace("/rpg/dashboard");
      return;
    }

    loadDashboard(user.orgId, user.dataLevel);
  }, [router]);

  async function loadDashboard(orgId: string, dataLevel: number) {
    try {
      setLoading(true);
      setError(null);

      const dashboards = await getDashboards(orgId);
      const defaultDb = dashboards.find((d) => d.isDefault) || dashboards[0];

      if (!defaultDb) {
        // No dashboard found — offer to import
        const tpls = await getDashboardTemplates();
        setTemplates(tpls);
        setNoDashboard(true);
        return;
      }

      const withData = await getDashboardData(defaultDb.id, dataLevel);
      setDashboard(withData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento del cruscotto");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(templateId: string) {
    const user = getStoredUser();
    if (!user?.orgId) return;

    try {
      setImporting(true);
      await importDashboardTemplate(user.orgId, templateId);
      setNoDashboard(false);
      await loadDashboard(user.orgId, user.dataLevel ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'importazione");
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <SkeletonPage rows={4} />;

  if (error) {
    return (
      <div>
        <PageHeader title="Cruscotto" subtitle="Monitoraggio PdR 125:2022" className="mb-6" />
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (noDashboard) {
    return (
      <div>
        <PageHeader title="Cruscotto" subtitle="Monitoraggio PdR 125:2022" className="mb-6" />
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Nessun cruscotto configurato per questa organizzazione.
          </p>
          {templates.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
              {templates.map((t) => (
                <Button
                  key={t.id}
                  onClick={() => handleImport(t.id)}
                  disabled={importing}
                >
                  {importing ? "Importazione..." : `Importa "${t.catalogTitle.it || t.catalogTitle.en || t.slug}"`}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun template disponibile.</p>
          )}
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div>
      <PageHeader
        title="Cruscotto"
        subtitle="Monitoraggio conformità UNI/PdR 125:2022"
        className="mb-6"
      />
      <DashboardRenderer dashboard={dashboard} />
    </div>
  );
}
