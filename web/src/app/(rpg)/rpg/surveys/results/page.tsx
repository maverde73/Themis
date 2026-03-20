"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSurveyResults,
  type SurveyResults,
  type AggregatedQuestion,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

export default function SurveyResultsPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center p-6"><p className="text-muted-foreground">Loading...</p></main>}>
      <SurveyResultsContent />
    </Suspense>
  );
}

function SurveyResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");

  const [results, setResults] = useState<SurveyResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    getSurveyResults(surveyId)
      .then(setResults)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load results"),
      )
      .finally(() => setLoading(false));
  }, [router, surveyId]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Loading results...</p>
      </main>
    );
  }

  if (error || !results) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error ?? "No data"}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">{results.title}</h1>
        <p className="text-sm text-muted-foreground">
          {results.totalResponses} response{results.totalResponses !== 1 ? "s" : ""} — version {results.version}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {results.questions.map((q) => (
          <QuestionResult key={q.questionId} question={q} />
        ))}
      </div>

      {results.questions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No responses yet.</p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function QuestionResult({ question }: { question: AggregatedQuestion }) {
  const data = question.data ?? {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{question.label}</CardTitle>
          <Badge variant="outline">{question.type}</Badge>
        </div>
        <CardDescription>
          {question.responseCount} response{question.responseCount !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {question.type === "choice" || question.type === "multi_choice"
          ? <ChoiceBars data={data as Record<string, number>} total={question.responseCount} />
          : null}

        {question.type === "rating"
          ? <RatingDisplay data={data as { avg: number; median: number; distribution: Record<string, number> }} />
          : null}

        {question.type === "nps"
          ? <NpsDisplay data={data as { score: number; promoters: number; passives: number; detractors: number }} />
          : null}

        {question.type === "ranking"
          ? <RankingDisplay data={data as Record<string, number>} />
          : null}

        {question.type === "likert"
          ? <LikertDisplay data={data as Record<string, Record<string, number>>} />
          : null}

        {(question.type === "text" || question.type === "long_text")
          ? <p className="text-sm text-muted-foreground">{(data as { count?: number }).count ?? 0} text responses (content is private)</p>
          : null}

        {question.type === "date"
          ? <p className="text-sm">Range: {(data as { min?: string }).min ?? "N/A"} — {(data as { max?: string }).max ?? "N/A"}</p>
          : null}
      </CardContent>
    </Card>
  );
}

function ChoiceBars({ data, total }: { data: Record<string, number>; total: number }) {
  const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);
  if (sorted.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;

  return (
    <div className="space-y-2">
      {sorted.map(([label, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span>{label}</span>
              <span className="text-muted-foreground">{count} ({pct}%)</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingDisplay({ data }: { data: { avg: number; median: number; distribution: Record<string, number> } }) {
  return (
    <div className="flex gap-8">
      <div>
        <p className="text-3xl font-bold">{data.avg}</p>
        <p className="text-xs text-muted-foreground">Average</p>
      </div>
      <div>
        <p className="text-3xl font-bold">{data.median}</p>
        <p className="text-xs text-muted-foreground">Median</p>
      </div>
      {data.distribution && (
        <div className="flex-1">
          <div className="flex gap-1 items-end h-12">
            {Object.entries(data.distribution)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([val, count]) => (
                <div key={val} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary rounded-t"
                    style={{ height: `${Math.max(4, count * 12)}px` }}
                  />
                  <span className="text-xs text-muted-foreground mt-1">{val}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NpsDisplay({ data }: { data: { score: number; promoters: number; passives: number; detractors: number } }) {
  const total = data.promoters + data.passives + data.detractors;
  return (
    <div className="flex gap-8 items-center">
      <div>
        <p className="text-4xl font-bold">{data.score}</p>
        <p className="text-xs text-muted-foreground">NPS Score</p>
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-green-600">Promoters (9-10)</span>
          <span>{data.promoters} ({total > 0 ? Math.round((data.promoters / total) * 100) : 0}%)</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-yellow-600">Passives (7-8)</span>
          <span>{data.passives} ({total > 0 ? Math.round((data.passives / total) * 100) : 0}%)</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-red-600">Detractors (0-6)</span>
          <span>{data.detractors} ({total > 0 ? Math.round((data.detractors / total) * 100) : 0}%)</span>
        </div>
      </div>
    </div>
  );
}

function RankingDisplay({ data }: { data: Record<string, number> }) {
  const sorted = Object.entries(data).sort(([, a], [, b]) => a - b);
  return (
    <div className="space-y-1">
      {sorted.map(([label, avgPos], i) => (
        <div key={label} className="flex items-center gap-3 py-1">
          <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
          <span className="text-sm flex-1">{label}</span>
          <span className="text-xs text-muted-foreground">avg position: {avgPos}</span>
        </div>
      ))}
    </div>
  );
}

function LikertDisplay({ data }: { data: Record<string, Record<string, number>> }) {
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([statement, counts]) => (
        <div key={statement}>
          <p className="text-sm font-medium mb-1">{statement}</p>
          <div className="flex gap-2">
            {Object.entries(counts)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([level, count]) => (
                <Badge key={level} variant="outline">
                  {level}: {count}
                </Badge>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
