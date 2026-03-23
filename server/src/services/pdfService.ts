import path from "path";
import pdfmake from "pdfmake";
import type { TDocumentDefinitions, Content, TableCell } from "pdfmake/interfaces";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";
import type { ExportRegistroQuery } from "../types/schemas";

// Configure fonts from pdfmake's bundled Roboto
const FONTS_DIR = path.join(
  path.dirname(require.resolve("pdfmake/package.json")),
  "build",
  "fonts",
  "Roboto",
);

pdfmake.addFonts({
  Roboto: {
    normal: path.join(FONTS_DIR, "Roboto-Regular.ttf"),
    bold: path.join(FONTS_DIR, "Roboto-Medium.ttf"),
    italics: path.join(FONTS_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(FONTS_DIR, "Roboto-MediumItalic.ttf"),
  },
});

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Ricevuta",
  ACKNOWLEDGED: "Presa in carico",
  INVESTIGATING: "Istruttoria",
  RESPONSE_GIVEN: "Riscontro dato",
  CLOSED_FOUNDED: "Fondata",
  CLOSED_UNFOUNDED: "Infondata",
  CLOSED_BAD_FAITH: "Mala fede",
};

const CHANNEL_LABELS: Record<string, string> = {
  PDR125: "PdR 125",
  WHISTLEBLOWING: "Whistleblowing",
};

function formatDate(d: Date | null): string {
  if (!d) return "-";
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatSla(met: boolean | null): string {
  if (met === null) return "-";
  return met ? "Nei termini" : "Fuori termine";
}

export async function generateRegistroPdf(query: ExportRegistroQuery): Promise<Buffer> {
  const org = await prisma.organization.findUnique({ where: { id: query.org_id } });
  if (!org) throw new AppError(404, "Organization not found");

  const where: Record<string, unknown> = { orgId: query.org_id };
  if (query.channel) where.channel = query.channel;
  if (query.from || query.to) {
    where.receivedAt = {
      ...(query.from && { gte: new Date(query.from) }),
      ...(query.to && { lte: new Date(query.to) }),
    };
  }

  const reports = await prisma.reportMetadata.findMany({
    where,
    orderBy: { receivedAt: "asc" },
  });

  const periodFrom = query.from ? formatDate(new Date(query.from)) : formatDate(reports[0]?.receivedAt ?? new Date());
  const periodTo = query.to ? formatDate(new Date(query.to)) : formatDate(new Date());

  // Build table rows
  const tableBody: TableCell[][] = [
    // Header row
    [
      { text: "ID", style: "tableHeader" },
      { text: "Data", style: "tableHeader" },
      { text: "Canale", style: "tableHeader" },
      { text: "Categoria", style: "tableHeader" },
      { text: "Stato", style: "tableHeader" },
      { text: "Data Chiusura", style: "tableHeader" },
      { text: "SLA Ack", style: "tableHeader" },
      { text: "SLA Risposta", style: "tableHeader" },
      { text: "Azione Correttiva", style: "tableHeader" },
    ],
  ];

  for (const r of reports) {
    tableBody.push([
      { text: r.id.slice(0, 8), fontSize: 7, font: "Roboto" },
      { text: formatDate(r.receivedAt), fontSize: 8 },
      { text: CHANNEL_LABELS[r.channel] ?? r.channel, fontSize: 8 },
      { text: r.category ?? "-", fontSize: 8 },
      { text: STATUS_LABELS[r.status] ?? r.status, fontSize: 8 },
      { text: formatDate(r.closedAt), fontSize: 8 },
      { text: formatSla(r.slaAckMet), fontSize: 8 },
      { text: formatSla(r.slaResponseMet), fontSize: 8 },
      { text: r.correctiveAction ?? "-", fontSize: 8 },
    ]);
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [30, 60, 30, 50],

    header: {
      columns: [
        {
          text: "REGISTRO DELLE SEGNALAZIONI",
          style: "header",
          margin: [30, 20, 0, 0],
        },
        {
          text: `UNI/PdR 125:2022 — Cap. 6.3.2.6`,
          alignment: "right",
          fontSize: 8,
          color: "#666666",
          margin: [0, 25, 30, 0],
        },
      ],
    },

    footer: (currentPage: number, pageCount: number): Content => ({
      columns: [
        {
          text: `Generato da Themis il ${formatDate(new Date())}`,
          fontSize: 7,
          color: "#999999",
          margin: [30, 0, 0, 0],
        },
        {
          text: `Pagina ${currentPage} di ${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: "#999999",
          margin: [0, 0, 30, 0],
        },
      ],
    }),

    content: [
      {
        columns: [
          { text: org.name, style: "orgName" },
          {
            text: `Periodo: ${periodFrom} — ${periodTo}`,
            alignment: "right",
            fontSize: 9,
            color: "#333333",
            margin: [0, 2, 0, 0],
          },
        ],
      },
      {
        text: `Totale segnalazioni nel periodo: ${reports.length}`,
        fontSize: 9,
        margin: [0, 4, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [45, 55, 50, 70, 65, 60, 55, 60, "*"],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#cccccc",
          vLineColor: () => "#cccccc",
          fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f0f0f0" : null),
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      },
      {
        text: "Nota: i nomi dei segnalanti non sono disponibili by design (sistema zero-knowledge). Il contenuto delle segnalazioni e' crittografato end-to-end e non transita dal server.",
        fontSize: 7,
        color: "#999999",
        italics: true,
        margin: [0, 15, 0, 0],
      },
    ],

    styles: {
      header: {
        fontSize: 14,
        bold: true,
      },
      orgName: {
        fontSize: 11,
        bold: true,
      },
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: "#333333",
      },
    },
  };

  const pdf = pdfmake.createPdf(docDefinition);
  return pdf.getBuffer();
}

export interface RegistroJsonRow {
  id: string;
  receivedAt: string;
  channel: string;
  category: string | null;
  status: string;
  closedAt: string | null;
  slaAckMet: boolean | null;
  slaResponseMet: boolean | null;
  correctiveAction: string | null;
}

export async function generateRegistroJson(query: ExportRegistroQuery): Promise<{
  orgName: string;
  period: { from: string; to: string };
  total: number;
  reports: RegistroJsonRow[];
}> {
  const org = await prisma.organization.findUnique({ where: { id: query.org_id } });
  if (!org) throw new AppError(404, "Organization not found");

  const where: Record<string, unknown> = { orgId: query.org_id };
  if (query.channel) where.channel = query.channel;
  if (query.from || query.to) {
    where.receivedAt = {
      ...(query.from && { gte: new Date(query.from) }),
      ...(query.to && { lte: new Date(query.to) }),
    };
  }

  const reports = await prisma.reportMetadata.findMany({
    where,
    orderBy: { receivedAt: "asc" },
  });

  return {
    orgName: org.name,
    period: {
      from: query.from ?? reports[0]?.receivedAt?.toISOString() ?? new Date().toISOString(),
      to: query.to ?? new Date().toISOString(),
    },
    total: reports.length,
    reports: reports.map((r) => ({
      id: r.id,
      receivedAt: r.receivedAt.toISOString(),
      channel: r.channel,
      category: r.category,
      status: r.status,
      closedAt: r.closedAt?.toISOString() ?? null,
      slaAckMet: r.slaAckMet,
      slaResponseMet: r.slaResponseMet,
      correctiveAction: r.correctiveAction,
    })),
  };
}

// ── Scheda Dati (Report 4 support) ──────────────────────────────────────

export interface SchedaDatiStats {
  orgName: string;
  period: { from: string; to: string };
  totalReports: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  sla: {
    ackTotal: number;
    ackMet: number;
    ackRate: number;
    responseTotal: number;
    responseMet: number;
    responseRate: number;
  };
  avgDays: {
    toAck: number | null;
    toResponse: number | null;
    toClose: number | null;
  };
}

function diffDays(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000);
}

export async function generateSchedaDati(
  orgId: string,
  from?: string,
  to?: string,
): Promise<SchedaDatiStats> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  const where: Record<string, unknown> = { orgId };
  if (from || to) {
    where.receivedAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const reports = await prisma.reportMetadata.findMany({ where, orderBy: { receivedAt: "asc" } });

  const byChannel: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let ackTotal = 0, ackMet = 0;
  let responseTotal = 0, responseMet = 0;
  const ackDays: number[] = [];
  const responseDays: number[] = [];
  const closeDays: number[] = [];

  for (const r of reports) {
    byChannel[r.channel] = (byChannel[r.channel] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    const cat = r.category ?? "Non classificata";
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    if (r.slaAckMet !== null) {
      ackTotal++;
      if (r.slaAckMet) ackMet++;
    }
    if (r.slaResponseMet !== null) {
      responseTotal++;
      if (r.slaResponseMet) responseMet++;
    }

    if (r.acknowledgedAt) ackDays.push(diffDays(r.receivedAt, r.acknowledgedAt));
    if (r.responseGivenAt) responseDays.push(diffDays(r.receivedAt, r.responseGivenAt));
    if (r.closedAt) closeDays.push(diffDays(r.receivedAt, r.closedAt));
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

  return {
    orgName: org.name,
    period: {
      from: from ?? reports[0]?.receivedAt?.toISOString() ?? new Date().toISOString(),
      to: to ?? new Date().toISOString(),
    },
    totalReports: reports.length,
    byChannel,
    byStatus,
    byCategory,
    sla: {
      ackTotal,
      ackMet,
      ackRate: ackTotal > 0 ? Math.round((ackMet / ackTotal) * 100) : 0,
      responseTotal,
      responseMet,
      responseRate: responseTotal > 0 ? Math.round((responseMet / responseTotal) * 100) : 0,
    },
    avgDays: {
      toAck: avg(ackDays),
      toResponse: avg(responseDays),
      toClose: avg(closeDays),
    },
  };
}

export async function generateSchedaDatiPdf(
  orgId: string,
  from?: string,
  to?: string,
): Promise<Buffer> {
  const stats = await generateSchedaDati(orgId, from, to);

  const channelRows: TableCell[][] = [
    [{ text: "Canale", style: "tableHeader" }, { text: "Segnalazioni", style: "tableHeader" }],
    ...Object.entries(stats.byChannel).map(([ch, count]) => [
      { text: CHANNEL_LABELS[ch] ?? ch, fontSize: 9 },
      { text: String(count), fontSize: 9, alignment: "right" as const },
    ]),
  ];

  const statusRows: TableCell[][] = [
    [{ text: "Stato", style: "tableHeader" }, { text: "Conteggio", style: "tableHeader" }],
    ...Object.entries(stats.byStatus).map(([st, count]) => [
      { text: STATUS_LABELS[st] ?? st, fontSize: 9 },
      { text: String(count), fontSize: 9, alignment: "right" as const },
    ]),
  ];

  const categoryRows: TableCell[][] = [
    [{ text: "Categoria", style: "tableHeader" }, { text: "Conteggio", style: "tableHeader" }],
    ...Object.entries(stats.byCategory).map(([cat, count]) => [
      { text: cat, fontSize: 9 },
      { text: String(count), fontSize: 9, alignment: "right" as const },
    ]),
  ];

  const periodFrom = from ? formatDate(new Date(from)) : formatDate(new Date(stats.period.from));
  const periodTo = to ? formatDate(new Date(to)) : formatDate(new Date());

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 50],

    header: {
      text: "SCHEDA DATI PER RIESAME DELLA DIREZIONE",
      style: "header",
      margin: [40, 20, 0, 0],
    },

    footer: (currentPage: number, pageCount: number): Content => ({
      columns: [
        { text: `Generato da Themis il ${formatDate(new Date())}`, fontSize: 7, color: "#999999", margin: [40, 0, 0, 0] },
        { text: `Pagina ${currentPage} di ${pageCount}`, alignment: "right", fontSize: 7, color: "#999999", margin: [0, 0, 40, 0] },
      ],
    }),

    content: [
      {
        columns: [
          { text: stats.orgName, style: "orgName" },
          { text: `Periodo: ${periodFrom} — ${periodTo}`, alignment: "right", fontSize: 9, color: "#333333", margin: [0, 2, 0, 0] },
        ],
      },
      { text: `Totale segnalazioni: ${stats.totalReports}`, fontSize: 10, margin: [0, 4, 0, 15] },

      // SLA section
      { text: "Conformita SLA", style: "sectionTitle", margin: [0, 0, 0, 6] },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: `Presa in carico: ${stats.sla.ackRate}% nei termini`, fontSize: 9, margin: [0, 0, 0, 2] },
              { text: `(${stats.sla.ackMet} su ${stats.sla.ackTotal} valutate)`, fontSize: 8, color: "#666666" },
            ],
          },
          {
            width: "50%",
            stack: [
              { text: `Riscontro finale: ${stats.sla.responseRate}% nei termini`, fontSize: 9, margin: [0, 0, 0, 2] },
              { text: `(${stats.sla.responseMet} su ${stats.sla.responseTotal} valutate)`, fontSize: 8, color: "#666666" },
            ],
          },
        ],
      },

      // Average days
      { text: "Tempi medi di gestione", style: "sectionTitle", margin: [0, 15, 0, 6] },
      {
        columns: [
          { text: `Presa in carico: ${stats.avgDays.toAck !== null ? `${stats.avgDays.toAck} gg` : "N/D"}`, fontSize: 9 },
          { text: `Riscontro: ${stats.avgDays.toResponse !== null ? `${stats.avgDays.toResponse} gg` : "N/D"}`, fontSize: 9 },
          { text: `Chiusura: ${stats.avgDays.toClose !== null ? `${stats.avgDays.toClose} gg` : "N/D"}`, fontSize: 9 },
        ],
      },

      // Tables
      { text: "Distribuzione per canale", style: "sectionTitle", margin: [0, 20, 0, 6] },
      {
        table: { headerRows: 1, widths: ["*", 80], body: channelRows },
        layout: "lightHorizontalLines",
      },

      { text: "Distribuzione per stato", style: "sectionTitle", margin: [0, 15, 0, 6] },
      {
        table: { headerRows: 1, widths: ["*", 80], body: statusRows },
        layout: "lightHorizontalLines",
      },

      { text: "Distribuzione per categoria", style: "sectionTitle", margin: [0, 15, 0, 6] },
      {
        table: { headerRows: 1, widths: ["*", 80], body: categoryRows },
        layout: "lightHorizontalLines",
      },

      {
        text: "Nota: questo documento contiene esclusivamente dati aggregati. Nessuna informazione sul contenuto delle segnalazioni transita dal server (architettura zero-knowledge).",
        fontSize: 7,
        color: "#999999",
        italics: true,
        margin: [0, 25, 0, 0],
      },
    ],

    styles: {
      header: { fontSize: 14, bold: true },
      orgName: { fontSize: 11, bold: true },
      sectionTitle: { fontSize: 10, bold: true, color: "#333333" },
      tableHeader: { bold: true, fontSize: 9, color: "#333333" },
    },
  };

  const pdf = pdfmake.createPdf(docDefinition);
  return pdf.getBuffer();
}

// ── Survey Results PDF (Report 5 partial) ───────────────────────────────

interface AggregatedQuestion {
  questionId: string;
  type: string;
  label: string | Record<string, string>;
  responseCount: number;
  data: unknown;
}

interface SurveyAggregation {
  surveyId: string;
  title: string;
  version: number;
  totalResponses: number;
  questions: AggregatedQuestion[];
}

function resolveLabel(label: string | Record<string, string>): string {
  if (typeof label === "string") return label;
  return label.it ?? label.en ?? Object.values(label)[0] ?? "";
}

function formatAggregationData(type: string, data: unknown): string {
  if (!data) return "-";

  if (type === "choice" || type === "multi_choice") {
    const counts = data as Record<string, number>;
    return Object.entries(counts)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }

  if (type === "rating") {
    const d = data as { avg: number; median: number };
    return `Media: ${d.avg}, Mediana: ${d.median}`;
  }

  if (type === "nps") {
    const d = data as { score: number; promoters: number; passives: number; detractors: number };
    return `NPS: ${d.score} (P:${d.promoters} N:${d.passives} D:${d.detractors})`;
  }

  if (type === "likert") {
    const d = data as Record<string, Record<string, number>>;
    return Object.entries(d)
      .map(([stmt, vals]) => {
        const counts = Object.entries(vals).map(([k, v]) => `${k}:${v}`).join(", ");
        return `${stmt} [${counts}]`;
      })
      .join("; ");
  }

  if (type === "text" || type === "long_text") {
    const d = data as { count: number };
    return `${d.count} risposte testuali (cifrate)`;
  }

  return JSON.stringify(data);
}

export async function generateSurveyResultsPdf(aggregation: SurveyAggregation): Promise<Buffer> {
  const tableBody: TableCell[][] = [
    [
      { text: "Domanda", style: "tableHeader" },
      { text: "Tipo", style: "tableHeader" },
      { text: "Risposte", style: "tableHeader" },
      { text: "Risultati", style: "tableHeader" },
    ],
  ];

  for (const q of aggregation.questions) {
    tableBody.push([
      { text: resolveLabel(q.label), fontSize: 8 },
      { text: q.type, fontSize: 8 },
      { text: String(q.responseCount), fontSize: 8, alignment: "right" as const },
      { text: formatAggregationData(q.type, q.data), fontSize: 8 },
    ]);
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [30, 60, 30, 50],

    header: {
      columns: [
        { text: "REPORT ANALITICO SURVEY", style: "header", margin: [30, 20, 0, 0] },
        { text: "UNI/PdR 125:2022 — Cap. 6.3.2.6", alignment: "right", fontSize: 8, color: "#666666", margin: [0, 25, 30, 0] },
      ],
    },

    footer: (currentPage: number, pageCount: number): Content => ({
      columns: [
        { text: `Generato da Themis il ${formatDate(new Date())}`, fontSize: 7, color: "#999999", margin: [30, 0, 0, 0] },
        { text: `Pagina ${currentPage} di ${pageCount}`, alignment: "right", fontSize: 7, color: "#999999", margin: [0, 0, 30, 0] },
      ],
    }),

    content: [
      { text: aggregation.title, style: "orgName" },
      { text: `Versione: ${aggregation.version} — Risposte totali: ${aggregation.totalResponses}`, fontSize: 9, margin: [0, 4, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 60, 50, "*"],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#cccccc",
          vLineColor: () => "#cccccc",
          fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f0f0f0" : null),
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
      },
      {
        text: "Nota: sono inclusi solo i risultati dei campi pubblici (accessLevel = 5). I campi privati sono crittografati E2E e non aggregabili server-side.",
        fontSize: 7,
        color: "#999999",
        italics: true,
        margin: [0, 15, 0, 0],
      },
    ],

    styles: {
      header: { fontSize: 14, bold: true },
      orgName: { fontSize: 11, bold: true },
      tableHeader: { bold: true, fontSize: 8, color: "#333333" },
    },
  };

  const pdf = pdfmake.createPdf(docDefinition);
  return pdf.getBuffer();
}
