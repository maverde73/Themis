/**
 * Dashboard data source registry.
 *
 * Each DataSourceType maps to an audited Prisma resolver that returns
 * ONLY metadata — never encrypted content. This is the zero-knowledge
 * boundary: no new data source type may leak report or survey content.
 */

import { prisma } from "../utils/prisma";
import type { ReportStatus } from "../generated/prisma/client";

// ── Data Source Types ────────────────────────────────────────────────

export type DataSourceType =
  | "reports_total"
  | "reports_by_status"
  | "reports_by_channel"
  | "reports_by_category"
  | "reports_by_outcome"
  | "reports_timeline"
  | "sla_compliance"
  | "sla_avg_resolution_days"
  | "reports_anonymous_vs_nominal"
  | "reports_with_attachments"
  | "data_retention_countdown"
  | "surveys_total"
  | "surveys_response_count";

// ── Widget config types ─────────────────────────────────────────────

export interface WidgetConfig {
  type: string; // widget component type (metric-card, bar-chart, etc.)
  title: string;
  dataSource: DataSourceType;
  accessLevel: number;
  params?: Record<string, unknown>;
}

export interface SectionConfig {
  title: string;
  columns?: number;
  widgets: WidgetConfig[];
}

export interface DashboardConfig {
  sections: SectionConfig[];
}

export interface ResolvedWidget {
  type: string;
  title: string;
  data: unknown;
  accessLevel: number;
}

export interface ResolvedSection {
  title: string;
  columns?: number;
  widgets: ResolvedWidget[];
}

export interface ResolvedDashboard {
  sections: ResolvedSection[];
}

// ── Resolvers ───────────────────────────────────────────────────────

type Resolver = (orgId: string, params?: Record<string, unknown>) => Promise<unknown>;

const resolvers: Record<DataSourceType, Resolver> = {
  async reports_total(orgId, params) {
    const channel = params?.channel as string | undefined;
    const count = await prisma.reportMetadata.count({
      where: { orgId, ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}) },
    });
    return { value: count };
  },

  async reports_by_status(orgId, params) {
    const channel = params?.channel as string | undefined;
    const groups = await prisma.reportMetadata.groupBy({
      by: ["status"],
      where: { orgId, ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}) },
      _count: true,
    });
    return groups.map((g) => ({ label: g.status, value: g._count }));
  },

  async reports_by_channel(orgId) {
    const groups = await prisma.reportMetadata.groupBy({
      by: ["channel"],
      where: { orgId },
      _count: true,
    });
    return groups.map((g) => ({ label: g.channel, value: g._count }));
  },

  async reports_by_category(orgId, params) {
    const channel = params?.channel as string | undefined;
    const groups = await prisma.reportMetadata.groupBy({
      by: ["category"],
      where: { orgId, ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}) },
      _count: true,
    });
    return groups.map((g) => ({ label: g.category || "N/A", value: g._count }));
  },

  async reports_by_outcome(orgId, params) {
    const channel = params?.channel as string | undefined;
    const where = {
      orgId,
      status: { in: ["CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH"] as ReportStatus[] },
      ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}),
    };
    const groups = await prisma.reportMetadata.groupBy({
      by: ["status"],
      where,
      _count: true,
    });

    const outcomeLabels: Record<string, string> = {
      CLOSED_FOUNDED: "Fondate",
      CLOSED_UNFOUNDED: "Infondate",
      CLOSED_BAD_FAITH: "In malafede",
    };

    return groups.map((g) => ({ label: outcomeLabels[g.status] || g.status, value: g._count }));
  },

  async reports_timeline(orgId, params) {
    const channel = params?.channel as string | undefined;
    const days = (params?.days as number) || 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const reports = await prisma.reportMetadata.findMany({
      where: {
        orgId,
        receivedAt: { gte: since },
        ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}),
      },
      select: { receivedAt: true },
      orderBy: { receivedAt: "asc" },
    });

    // Group by month
    const byMonth: Record<string, number> = {};
    for (const r of reports) {
      const key = r.receivedAt.toISOString().slice(0, 7); // YYYY-MM
      byMonth[key] = (byMonth[key] || 0) + 1;
    }
    return Object.entries(byMonth).map(([month, count]) => ({ label: month, value: count }));
  },

  async sla_compliance(orgId, params) {
    const channel = params?.channel as string | undefined;
    const where = { orgId, ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}) };

    const total = await prisma.reportMetadata.count({ where });
    const ackMet = await prisma.reportMetadata.count({
      where: { ...where, slaAckMet: true },
    });
    const responseMet = await prisma.reportMetadata.count({
      where: { ...where, slaResponseMet: true },
    });
    const overdue = await prisma.reportMetadata.count({
      where: {
        ...where,
        OR: [
          { slaAckDeadline: { lt: new Date() }, slaAckMet: null },
          { slaResponseDeadline: { lt: new Date() }, slaResponseMet: null },
        ],
      },
    });

    return {
      total,
      ackCompliance: total > 0 ? Math.round((ackMet / total) * 100) : 100,
      responseCompliance: total > 0 ? Math.round((responseMet / total) * 100) : 100,
      overdue,
    };
  },

  async sla_avg_resolution_days(orgId, params) {
    const channel = params?.channel as string | undefined;
    const resolved = await prisma.reportMetadata.findMany({
      where: {
        orgId,
        closedAt: { not: null },
        ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}),
      },
      select: { receivedAt: true, closedAt: true },
    });

    if (resolved.length === 0) return { value: 0, count: 0 };

    const totalDays = resolved.reduce((sum, r) => {
      const days = (r.closedAt!.getTime() - r.receivedAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return { value: Math.round(totalDays / resolved.length), count: resolved.length };
  },

  async reports_anonymous_vs_nominal(orgId, params) {
    const channel = params?.channel as string | undefined;
    const where = { orgId, ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}) };

    const anonymous = await prisma.reportMetadata.count({
      where: { ...where, identityRevealed: false },
    });
    const nominal = await prisma.reportMetadata.count({
      where: { ...where, identityRevealed: true },
    });
    const unknown = await prisma.reportMetadata.count({
      where: { ...where, identityRevealed: null },
    });

    return [
      { label: "Anonime", value: anonymous },
      { label: "Nominali", value: nominal },
      { label: "N/D", value: unknown },
    ];
  },

  async reports_with_attachments(orgId, params) {
    const channel = params?.channel as string | undefined;
    const where = { orgId, ...(channel ? { channel: channel as "PDR125" | "WHISTLEBLOWING" } : {}) };

    const withAttachments = await prisma.reportMetadata.count({
      where: { ...where, hasAttachments: true },
    });
    const total = await prisma.reportMetadata.count({ where });

    return { withAttachments, total, percentage: total > 0 ? Math.round((withAttachments / total) * 100) : 0 };
  },

  async data_retention_countdown(orgId) {
    const oldest = await prisma.reportMetadata.findFirst({
      where: { orgId, status: { in: ["CLOSED_FOUNDED", "CLOSED_UNFOUNDED", "CLOSED_BAD_FAITH"] } },
      orderBy: { closedAt: "asc" },
      select: { closedAt: true },
    });

    if (!oldest?.closedAt) return { daysRemaining: null };

    // Default retention: 5 years from close date (PdR 125 standard)
    const retentionEnd = new Date(oldest.closedAt);
    retentionEnd.setFullYear(retentionEnd.getFullYear() + 5);
    const daysRemaining = Math.ceil((retentionEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return { daysRemaining, retentionEnd: retentionEnd.toISOString() };
  },

  async surveys_total(orgId) {
    const count = await prisma.survey.count({ where: { orgId } });
    return { value: count };
  },

  async surveys_response_count(orgId, params) {
    const surveyId = params?.surveyId as string | undefined;
    const count = await prisma.surveyResponse.count({
      where: { orgId, ...(surveyId ? { surveyId } : {}) },
    });
    return { value: count };
  },
};

// ── Main resolver ───────────────────────────────────────────────────

export async function resolveDashboard(
  orgId: string,
  config: DashboardConfig,
  userAccessLevel: number,
): Promise<ResolvedDashboard> {
  const sections: ResolvedSection[] = [];

  for (const section of config.sections) {
    const visibleWidgets = section.widgets.filter(
      (w) => w.accessLevel >= userAccessLevel,
    );

    const resolvedWidgets = await Promise.all(
      visibleWidgets.map(async (widget) => {
        const resolver = resolvers[widget.dataSource];
        if (!resolver) {
          return { type: widget.type, title: widget.title, data: null, accessLevel: widget.accessLevel };
        }
        const data = await resolver(orgId, widget.params);
        return { type: widget.type, title: widget.title, data, accessLevel: widget.accessLevel };
      }),
    );

    if (resolvedWidgets.length > 0) {
      sections.push({
        title: section.title,
        columns: section.columns,
        widgets: resolvedWidgets,
      });
    }
  }

  return { sections };
}
