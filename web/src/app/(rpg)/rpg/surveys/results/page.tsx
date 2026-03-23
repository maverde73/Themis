"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSurveyResults,
  getPrivateEvents,
  exportSurveyResultsPdf,
  type SurveyResults,
  type PrivateNostrEvent,
} from "@/lib/api";
import { SurveyResultsView } from "@/components/survey-results-view";
import { isAuthenticated } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { SkeletonPage } from "@/components/skeleton-page";
import { EmptyState } from "@/components/empty-state";
import { EncryptedResponseViewer } from "@/components/encrypted-response-viewer";

export default function SurveyResultsPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <SurveyResultsContent />
    </Suspense>
  );
}

function SurveyResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");

  const [results, setResults] = useState<SurveyResults | null>(null);
  const [privateEvents, setPrivateEvents] = useState<PrivateNostrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!surveyId) return;
    setExporting(true);
    try {
      const blob = await exportSurveyResultsPdf(surveyId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey-results-${surveyId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'esportazione");
    } finally {
      setExporting(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (!surveyId) {
      setError("Missing surveyId parameter");
      setLoading(false);
      return;
    }

    Promise.all([
      getSurveyResults(surveyId),
      getPrivateEvents().catch(() => [] as PrivateNostrEvent[]),
    ])
      .then(([res, events]) => {
        setResults(res);
        setPrivateEvents(events);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load results"),
      )
      .finally(() => setLoading(false));
  }, [router, surveyId]);

  if (loading) {
    return <SkeletonPage />;
  }

  if (error || !results) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error ?? "No data"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <PageHeader
          title={results.title}
          subtitle={`${results.totalResponses} response${results.totalResponses !== 1 ? "s" : ""} — version ${results.version}`}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={handleExportPdf}
        >
          <Download className="mr-2 h-4 w-4" />
          Esporta PDF
        </Button>
      </div>

      <SurveyResultsView results={results} />

      {/* Private encrypted responses */}
      {privateEvents.length > 0 && (
        <EncryptedResponseViewer encryptedEvents={privateEvents} />
      )}

      {results.questions.length === 0 && privateEvents.length === 0 && (
        <EmptyState title="No responses yet" description="Responses will appear here as they are submitted." />
      )}
    </div>
  );
}

