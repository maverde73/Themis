"use client";

import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import type { DashboardWithData, ResolvedSection, ResolvedWidget } from "@/lib/api";

// ── Grid mapping ────────────────────────────────────────────────────

const GRID_COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

// ── Label maps ──────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  molestia_sessuale: "Molestie sessuali",
  discriminazione_genere: "Discriminazione di genere",
  mobbing: "Mobbing",
  linguaggio_offensivo: "Linguaggio offensivo",
  microaggressione: "Microaggressioni",
  altro: "Altro",
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Ricevute",
  ACKNOWLEDGED: "Prese in carico",
  INVESTIGATING: "In istruttoria",
  RESPONSE_GIVEN: "Risposta data",
  CLOSED_FOUNDED: "Chiuse — Fondate",
  CLOSED_UNFOUNDED: "Chiuse — Infondate",
  CLOSED_BAD_FAITH: "Chiuse — Malafede",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-500",
  ACKNOWLEDGED: "bg-sky-500",
  INVESTIGATING: "bg-amber-500",
  RESPONSE_GIVEN: "bg-emerald-500",
  CLOSED_FOUNDED: "bg-green-500",
  CLOSED_UNFOUNDED: "bg-gray-400",
  CLOSED_BAD_FAITH: "bg-red-500",
};

const CHART_COLORS = [
  "oklch(0.488 0.243 264)",
  "oklch(0.600 0.160 240)",
  "oklch(0.650 0.140 195)",
  "oklch(0.541 0.200 280)",
  "oklch(0.580 0.180 330)",
  "oklch(0.700 0.120 145)",
  "oklch(0.550 0.150 50)",
  "oklch(0.620 0.100 310)",
];

// ── Metric card accent colors (cycle by widget index) ───────────────

const METRIC_ACCENTS = [
  { border: "border-l-blue-500", icon: "text-blue-500", bg: "bg-blue-50" },
  { border: "border-l-violet-500", icon: "text-violet-500", bg: "bg-violet-50" },
  { border: "border-l-emerald-500", icon: "text-emerald-500", bg: "bg-emerald-50" },
  { border: "border-l-amber-500", icon: "text-amber-500", bg: "bg-amber-50" },
  { border: "border-l-rose-500", icon: "text-rose-500", bg: "bg-rose-50" },
  { border: "border-l-cyan-500", icon: "text-cyan-500", bg: "bg-cyan-50" },
];

// ── Custom tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-lg ring-1 ring-foreground/5">
      <p className="font-medium text-card-foreground">{label}</p>
      <p className="tabular-nums text-muted-foreground">{payload[0].value}</p>
    </div>
  );
}

// ── Widget renderers ────────────────────────────────────────────────

let metricIndex = 0;

function MetricCardWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as { value?: number; count?: number; withAttachments?: number; total?: number; percentage?: number } | null;
  if (!data) return <EmptyWidget title={widget.title} />;

  const accent = METRIC_ACCENTS[metricIndex++ % METRIC_ACCENTS.length];

  let display: string;
  let subtitle: string | null = null;

  if (data.withAttachments !== undefined) {
    display = String(data.withAttachments);
    subtitle = `${data.percentage ?? 0}% su ${data.total ?? 0} totali`;
  } else if (data.count !== undefined && data.count > 0) {
    display = `${data.value} gg`;
    subtitle = `su ${data.count} chiuse`;
  } else {
    display = String(data.value ?? 0);
  }

  return (
    <Card className={`border-l-4 ${accent.border}`}>
      <CardHeader className="pb-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</p>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tracking-tighter">{display}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function BarChartWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as { label: string; value: number }[] | null;
  if (!data || data.length === 0) return <EmptyWidget title={widget.title} />;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.01 270)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(0.95 0.01 270)" }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PieChartWidget({ widget }: { widget: ResolvedWidget }) {
  const raw = widget.data as { label: string; value: number }[] | null;
  if (!raw || raw.length === 0) return <EmptyWidget title={widget.title} />;

  const data = raw.map((d) => ({
    ...d,
    label: CATEGORY_LABELS[d.label] || d.label,
  }));

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              strokeWidth={2}
              stroke="oklch(1 0 0)"
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {data.map((d, i) => (
            <div key={d.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span>{d.label}</span>
              <span className="font-semibold text-foreground">{d.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AreaChartWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as { label: string; value: number }[] | null;
  if (!data || data.length === 0) return <EmptyWidget title={widget.title} />;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.488 0.243 264)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.488 0.243 264)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.01 270)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="oklch(0.488 0.243 264)"
              strokeWidth={2.5}
              fill="url(#areaGradient)"
              dot={{ r: 4, fill: "oklch(0.488 0.243 264)", strokeWidth: 2, stroke: "white" }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "white" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function StatusListWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as { label: string; value: number }[] | null;
  if (!data || data.length === 0) return <EmptyWidget title={widget.title} />;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-col gap-2.5">
          {data.map((item) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.label} className="group">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[item.label] || "bg-gray-400"}`} />
                    <span className="text-sm">
                      {STATUS_LABELS[item.label] || item.label.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{item.value}</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${STATUS_DOT_COLORS[item.label] || "bg-gray-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SlaSemaphoreWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as {
    ackCompliance?: number;
    responseCompliance?: number;
    overdue?: number;
    total?: number;
  } | null;
  if (!data) return <EmptyWidget title={widget.title} />;

  const lights = [
    { label: "Presa in carico", value: data.ackCompliance ?? 0 },
    { label: "Risposta", value: data.responseCompliance ?? 0 },
  ];

  function semaphoreColor(pct: number) {
    if (pct >= 90) return { dot: "bg-emerald-500", bar: "bg-emerald-500", ring: "ring-emerald-500/20" };
    if (pct >= 70) return { dot: "bg-amber-500", bar: "bg-amber-500", ring: "ring-amber-500/20" };
    return { dot: "bg-red-500", bar: "bg-red-500", ring: "ring-red-500/20" };
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-col gap-4">
          {lights.map((l) => {
            const colors = semaphoreColor(l.value);
            return (
              <div key={l.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-3 w-3 rounded-full ring-4 ${colors.dot} ${colors.ring}`} />
                    <span className="text-sm font-medium">{l.label}</span>
                  </div>
                  <span className="text-lg font-bold tabular-nums">{l.value}%</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                    style={{ width: `${l.value}%` }}
                  />
                </div>
              </div>
            );
          })}
          {(data.overdue ?? 0) > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <p className="text-xs font-medium text-red-700">
                {data.overdue} segnalazioni scadute
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RetentionCountdownWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as { daysRemaining?: number | null; retentionEnd?: string } | null;
  if (!data) return <EmptyWidget title={widget.title} />;

  if (data.daysRemaining == null) {
    return (
      <Card className="border-l-4 border-l-gray-300">
        <CardHeader className="pb-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</p>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-muted-foreground">Nessun dato chiuso</p>
        </CardContent>
      </Card>
    );
  }

  const endDate = data.retentionEnd
    ? new Date(data.retentionEnd).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })
    : "N/D";

  const urgent = data.daysRemaining < 365;

  return (
    <Card className={`border-l-4 ${urgent ? "border-l-amber-500" : "border-l-emerald-500"}`}>
      <CardHeader className="pb-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tracking-tighter">{data.daysRemaining}</span>
          <span className="text-sm font-medium text-muted-foreground">giorni restanti</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Scadenza: {endDate}</p>
      </CardContent>
    </Card>
  );
}

function EmptyWidget({ title }: { title: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-sm italic text-muted-foreground/60">Nessun dato disponibile</p>
      </CardHeader>
    </Card>
  );
}

// ── Widget dispatcher ───────────────────────────────────────────────

const WIDGET_MAP: Record<string, React.ComponentType<{ widget: ResolvedWidget }>> = {
  "metric-card": MetricCardWidget,
  "bar-chart": BarChartWidget,
  "pie-chart": PieChartWidget,
  "area-chart": AreaChartWidget,
  "status-list": StatusListWidget,
  "sla-semaphore": SlaSemaphoreWidget,
  "retention-countdown": RetentionCountdownWidget,
};

function WidgetRenderer({ widget }: { widget: ResolvedWidget }) {
  const Component = WIDGET_MAP[widget.type];
  if (!Component) return <EmptyWidget title={`${widget.title} (tipo sconosciuto: ${widget.type})`} />;
  return <Component widget={widget} />;
}

// ── Section renderer ────────────────────────────────────────────────

function SectionRenderer({ section }: { section: ResolvedSection }) {
  const cols = section.columns ?? 2;
  const gridClass = GRID_COLS[cols] || "md:grid-cols-2";

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-base font-semibold tracking-tight">{section.title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className={`grid gap-4 grid-cols-1 ${gridClass}`}>
        {section.widgets.map((widget, i) => (
          <WidgetRenderer key={`${widget.type}-${i}`} widget={widget} />
        ))}
      </div>
    </section>
  );
}

// ── Main component ──────────────────────────────────────────────────

interface DashboardRendererProps {
  dashboard: DashboardWithData;
}

export function DashboardRenderer({ dashboard }: DashboardRendererProps) {
  const { sections } = dashboard.resolvedData;

  // Reset metric accent counter on each render
  metricIndex = 0;

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="text-muted-foreground">Nessun widget visibile per il tuo livello di accesso.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {sections.map((section, i) => (
        <SectionRenderer key={`${section.title}-${i}`} section={section} />
      ))}
    </div>
  );
}
