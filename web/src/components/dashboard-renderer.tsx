"use client";

import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CLOSED_FOUNDED: "Chiuse - Fondate",
  CLOSED_UNFOUNDED: "Chiuse - Infondate",
  CLOSED_BAD_FAITH: "Chiuse - Malafede",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "bg-blue-100 text-blue-800",
  ACKNOWLEDGED: "bg-sky-100 text-sky-800",
  INVESTIGATING: "bg-amber-100 text-amber-800",
  RESPONSE_GIVEN: "bg-emerald-100 text-emerald-800",
  CLOSED_FOUNDED: "bg-green-100 text-green-800",
  CLOSED_UNFOUNDED: "bg-gray-100 text-gray-800",
  CLOSED_BAD_FAITH: "bg-red-100 text-red-800",
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

// ── Widget renderers ────────────────────────────────────────────────

function MetricCardWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as { value?: number; count?: number; withAttachments?: number; total?: number; percentage?: number } | null;
  if (!data) return <EmptyWidget title={widget.title} />;

  let display: string;
  let subtitle: string | null = null;

  if (data.withAttachments !== undefined) {
    display = String(data.withAttachments);
    subtitle = `${data.percentage ?? 0}% su ${data.total ?? 0}`;
  } else if (data.count !== undefined && data.count > 0) {
    display = `${data.value} gg`;
    subtitle = `su ${data.count} chiuse`;
  } else {
    display = String(data.value ?? 0);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-muted-foreground">{widget.title}</p>
        <p className="text-3xl font-bold tracking-tight">{display}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
    </Card>
  );
}

function BarChartWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as { label: string; value: number }[] | null;
  if (!data || data.length === 0) return <EmptyWidget title={widget.title} />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function AreaChartWidget({ widget }: { widget: ResolvedWidget }) {
  const data = widget.data as { label: string; value: number }[] | null;
  if (!data || data.length === 0) return <EmptyWidget title={widget.title} />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.2}
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {data.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
            >
              <Badge className={STATUS_COLORS[item.label] || "bg-gray-100 text-gray-800"}>
                {STATUS_LABELS[item.label] || item.label.replace(/_/g, " ").toLowerCase()}
              </Badge>
              <span className="text-sm font-semibold tabular-nums">{item.value}</span>
            </li>
          ))}
        </ul>
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
    if (pct >= 90) return "bg-green-500";
    if (pct >= 70) return "bg-yellow-500";
    return "bg-red-500";
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {lights.map((l) => (
            <div key={l.label} className="flex items-center gap-3">
              <div className={`h-4 w-4 shrink-0 rounded-full ${semaphoreColor(l.value)}`} />
              <span className="text-sm">{l.label}</span>
              <span className="ml-auto text-sm font-semibold tabular-nums">{l.value}%</span>
            </div>
          ))}
          {(data.overdue ?? 0) > 0 && (
            <p className="text-xs text-destructive">
              {data.overdue} segnalazioni scadute
            </p>
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
      <Card>
        <CardHeader className="pb-2">
          <p className="text-sm text-muted-foreground">{widget.title}</p>
          <p className="text-lg font-semibold">Nessun dato chiuso</p>
        </CardHeader>
      </Card>
    );
  }

  const endDate = data.retentionEnd
    ? new Date(data.retentionEnd).toLocaleDateString("it-IT")
    : "N/D";

  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-muted-foreground">{widget.title}</p>
        <p className="text-3xl font-bold tracking-tight">
          {data.daysRemaining} <span className="text-base font-normal text-muted-foreground">giorni</span>
        </p>
        <p className="text-xs text-muted-foreground">Scadenza: {endDate}</p>
      </CardHeader>
    </Card>
  );
}

function EmptyWidget({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-sm italic text-muted-foreground">Nessun dato</p>
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
      <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
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

  if (sections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Nessun widget visibile per il tuo livello di accesso.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section, i) => (
        <SectionRenderer key={`${section.title}-${i}`} section={section} />
      ))}
    </div>
  );
}
