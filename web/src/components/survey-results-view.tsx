"use client";

import { useMemo } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  MessageSquareText,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SurveyResults, AggregatedQuestion, OptionMeta } from "@/lib/api";

// ── Colors ──────────────────────────────────────────────────────────────

const BAR_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6",
  "#22c55e", "#ef4444", "#06b6d4", "#a855f7", "#f97316",
  "#8b5cf6", "#10b981",
];

// ── Main component ─────────────────────────────────────────────────────

interface SurveyResultsViewProps {
  results: SurveyResults;
}

export function SurveyResultsView({ results }: SurveyResultsViewProps) {
  const stats = useMemo(() => computeStats(results), [results]);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Risposte"
          value={results.totalResponses}
          icon={<Users className="h-5 w-5" />}
          accent="text-indigo-500"
          bg="bg-indigo-50 dark:bg-indigo-950/30"
        />
        <KpiCard
          label="Domande"
          value={stats.questionCount}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="text-emerald-500"
          bg="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <KpiCard
          label="Tasso risposta"
          value={stats.avgResponseRate > 0 ? `${stats.avgResponseRate}%` : "—"}
          icon={<BarChart3 className="h-5 w-5" />}
          accent="text-amber-500"
          bg="bg-amber-50 dark:bg-amber-950/30"
        />
        <KpiCard
          label="Attivo da"
          value={stats.daysActive > 0 ? `${stats.daysActive}g` : "—"}
          icon={<CalendarDays className="h-5 w-5" />}
          accent="text-sky-500"
          bg="bg-sky-50 dark:bg-sky-950/30"
        />
      </div>

      {/* Trend chart */}
      {results.responsesByMonth && Object.keys(results.responsesByMonth).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Risposte nel tempo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={results.responsesByMonth} />
          </CardContent>
        </Card>
      )}

      {/* Questions grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {results.questions.map((q, idx) => (
          <QuestionCard key={q.questionId} question={q} index={idx + 1} />
        ))}
      </div>

      {results.questions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquareText className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nessuna risposta ancora. I risultati appariranno qui quando verranno inviate.
          </p>
        </div>
      )}
    </div>
  );
}

// ── KPI Card ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  accent,
  bg,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${accent}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Monthly Trend Chart ─────────────────────────────────────────────────

function MonthlyTrendChart({ data }: { data: Record<string, number> }) {
  const sorted = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...sorted.map(([, v]) => v), 1);
  const barH = 120;

  return (
    <div className="flex items-end gap-2 h-40 pt-4">
      {sorted.map(([month, count]) => {
        const h = (count / max) * barH;
        const label = formatMonth(month);
        return (
          <div key={month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-medium tabular-nums">{count}</span>
            <div
              className="w-full rounded-t-md bg-indigo-500/80 transition-all"
              style={{ height: `${Math.max(h, 2)}px` }}
            />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

// ── Question Card ───────────────────────────────────────────────────────

function QuestionCard({ question, index }: { question: AggregatedQuestion; index: number }) {
  const data = question.data ?? {};

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-snug">
            <span className="text-muted-foreground mr-1">{index}.</span>
            {localized(question.label)}
          </CardTitle>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {question.type}
          </Badge>
        </div>
        <CardDescription>
          {question.responseCount} rispost{question.responseCount !== 1 ? "e" : "a"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {(question.type === "choice" || question.type === "multi_choice") && (
          <ChoiceBars data={data as Record<string, number>} options={question.options} />
        )}

        {question.type === "rating" && (
          <RatingDisplay data={data as { avg: number; median: number; distribution: Record<string, number> }} />
        )}

        {question.type === "nps" && (
          <NpsDisplay data={data as { score: number; promoters: number; passives: number; detractors: number }} />
        )}

        {question.type === "ranking" && (
          <RankingDisplay data={data as Record<string, number>} />
        )}

        {question.type === "likert" && (
          <LikertDisplay data={data as Record<string, Record<string, number>>} />
        )}

        {(question.type === "text" || question.type === "long_text") && (
          <p className="text-sm text-muted-foreground">
            {(data as { count?: number }).count ?? 0} risposte testuali (contenuto privato)
          </p>
        )}

        {question.type === "date" && (
          <p className="text-sm">
            Range: {(data as { min?: string }).min ?? "N/D"} — {(data as { max?: string }).max ?? "N/D"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Choice Bars (Google Forms style) ────────────────────────────────────

function ChoiceBars({ data, options }: { data: Record<string, number>; options?: OptionMeta[] }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Nessuna opzione configurata</p>;
  }

  // Build a value→label map from options metadata
  const labelMap = new Map<string, string>();
  if (options) {
    for (const opt of options) {
      labelMap.set(opt.value, localized(opt.label));
    }
  }

  const maxCount = Math.max(...entries.map(([, c]) => c), 1);
  const ticks = buildTicks(maxCount);

  return (
    <div className="flex gap-4">
      {/* Legend column */}
      <div className="flex flex-col justify-start gap-[7px] shrink-0 min-w-0 pt-px">
        {entries.map(([value], i) => (
          <div key={value} className="flex items-center gap-2 h-5 text-xs min-w-0">
            <span
              className="inline-block size-2 rounded-full shrink-0"
              style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
            />
            <span className="truncate max-w-[180px]">{labelMap.get(value) ?? value}</span>
          </div>
        ))}
      </div>

      {/* Counts column */}
      <div className="flex flex-col justify-start gap-[7px] shrink-0 pt-px">
        {entries.map(([value, count]) => (
          <div key={value} className="h-5 flex items-center">
            <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{count}</span>
          </div>
        ))}
      </div>

      {/* Bars + axis */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col gap-[7px]">
          {entries.map(([value, count], i) => (
            <div key={value} className="h-5 flex items-center">
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: maxCount > 0 ? `${(count / maxCount) * 100}%` : "0%",
                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  minWidth: count > 0 ? "4px" : undefined,
                }}
              />
            </div>
          ))}
        </div>
        {/* X axis */}
        <div className="flex justify-between mt-1.5 border-t border-border/50 pt-1">
          {ticks.map((t) => (
            <span key={t} className="text-[10px] text-muted-foreground tabular-nums">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildTicks(max: number): number[] {
  if (max <= 5) return Array.from({ length: max + 1 }, (_, i) => i);
  const step = Math.ceil(max / 5);
  const ticks: number[] = [];
  for (let i = 0; i <= max; i += step) ticks.push(i);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

// ── Rating ──────────────────────────────────────────────────────────────

function RatingDisplay({ data }: { data: { avg: number; median: number; distribution: Record<string, number> } }) {
  return (
    <div className="flex gap-8">
      <div>
        <p className="text-3xl font-bold">{data.avg}</p>
        <p className="text-xs text-muted-foreground">Media</p>
      </div>
      <div>
        <p className="text-3xl font-bold">{data.median}</p>
        <p className="text-xs text-muted-foreground">Mediana</p>
      </div>
      {data.distribution && (
        <div className="flex-1">
          <div className="flex gap-1 items-end h-12">
            {Object.entries(data.distribution)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([val, count]) => (
                <div key={val} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-indigo-500/80 rounded-t"
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

// ── NPS ─────────────────────────────────────────────────────────────────

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
          <span className="text-green-600">Promotori (9-10)</span>
          <span>{data.promoters} ({total > 0 ? Math.round((data.promoters / total) * 100) : 0}%)</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-yellow-600">Passivi (7-8)</span>
          <span>{data.passives} ({total > 0 ? Math.round((data.passives / total) * 100) : 0}%)</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-red-600">Detrattori (0-6)</span>
          <span>{data.detractors} ({total > 0 ? Math.round((data.detractors / total) * 100) : 0}%)</span>
        </div>
      </div>
    </div>
  );
}

// ── Ranking ─────────────────────────────────────────────────────────────

function RankingDisplay({ data }: { data: Record<string, number> }) {
  const sorted = Object.entries(data).sort(([, a], [, b]) => a - b);
  return (
    <div className="space-y-1">
      {sorted.map(([label, avgPos], i) => (
        <div key={label} className="flex items-center gap-3 py-1">
          <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
          <span className="text-sm flex-1">{label}</span>
          <span className="text-xs text-muted-foreground">pos. media: {avgPos}</span>
        </div>
      ))}
    </div>
  );
}

// ── Likert ──────────────────────────────────────────────────────────────

function LikertDisplay({ data }: { data: Record<string, Record<string, number>> }) {
  return (
    <div className="space-y-3">
      {Object.entries(data).map(([statement, counts]) => (
        <div key={statement}>
          <p className="text-sm font-medium mb-1">{statement}</p>
          <div className="flex gap-2 flex-wrap">
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

// ── Helpers ─────────────────────────────────────────────────────────────

function localized(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, string>;
    return obj.it ?? obj.en ?? Object.values(obj)[0] ?? "";
  }
  return String(value ?? "");
}

function computeStats(results: SurveyResults) {
  const questionCount = results.questions.length;
  const choiceQuestions = results.questions.filter(
    (q) => q.type === "choice" || q.type === "multi_choice",
  );
  const avgResponseRate =
    results.totalResponses > 0 && choiceQuestions.length > 0
      ? Math.round(
          (choiceQuestions.reduce((sum, q) => sum + q.responseCount, 0) /
            (choiceQuestions.length * results.totalResponses)) *
            100,
        )
      : 0;

  const daysActive = results.createdAt
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() - new Date(results.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  return { questionCount, avgResponseRate, daysActive };
}
