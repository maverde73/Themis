import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";

import type { SurveySchemaDefinition, SurveyQuestion } from "../types/surveySchemas";

interface OptionMeta {
  value: string;
  label: string | Record<string, string>;
}

interface AggregatedQuestion {
  questionId: string;
  type: string;
  label: string | Record<string, string>;
  responseCount: number;
  data: unknown;
  options?: OptionMeta[];
}

/** Extracts plain string values from i18n options (backwards compat). */
function resolveOptionValues(
  options?: (string | { value: string; label: unknown })[]
): string[] | undefined {
  if (!options) return undefined;
  return options.map((o) => (typeof o === "string" ? o : o.value));
}

/** Builds option metadata with localized labels for the frontend. */
function resolveOptionMeta(
  options?: (string | { value: string; label: unknown })[]
): OptionMeta[] | undefined {
  if (!options || options.length === 0) return undefined;
  return options.map((o) => {
    if (typeof o === "string") return { value: o, label: o };
    return { value: o.value, label: o.label as string | Record<string, string> };
  });
}

function aggregateChoice(answers: unknown[], allOptions?: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  if (allOptions) {
    for (const opt of allOptions) counts[opt] = 0;
  }
  for (const a of answers) {
    if (typeof a === "string") {
      counts[a] = (counts[a] || 0) + 1;
    }
  }
  return counts;
}

function aggregateMultiChoice(answers: unknown[], allOptions?: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  if (allOptions) {
    for (const opt of allOptions) counts[opt] = 0;
  }
  for (const a of answers) {
    if (Array.isArray(a)) {
      for (const item of a) {
        if (typeof item === "string") {
          counts[item] = (counts[item] || 0) + 1;
        }
      }
    }
  }
  return counts;
}

function aggregateRating(answers: unknown[]): { avg: number; median: number; distribution: Record<number, number> } {
  const nums = answers.filter((a): a is number => typeof a === "number");
  if (nums.length === 0) return { avg: 0, median: 0, distribution: {} };

  const sorted = [...nums].sort((a, b) => a - b);
  const avg = nums.reduce((s, n) => s + n, 0) / nums.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  const distribution: Record<number, number> = {};
  for (const n of nums) {
    distribution[n] = (distribution[n] || 0) + 1;
  }

  return { avg: Math.round(avg * 100) / 100, median, distribution };
}

function aggregateNps(answers: unknown[]): { score: number; promoters: number; passives: number; detractors: number } {
  const nums = answers.filter((a): a is number => typeof a === "number" && a >= 0 && a <= 10);
  if (nums.length === 0) return { score: 0, promoters: 0, passives: 0, detractors: 0 };

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const n of nums) {
    if (n >= 9) promoters++;
    else if (n >= 7) passives++;
    else detractors++;
  }

  const score = Math.round(((promoters - detractors) / nums.length) * 100);
  return { score, promoters, passives, detractors };
}

function aggregateLikert(answers: unknown[], statements?: string[]): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  if (statements) {
    for (const stmt of statements) {
      result[stmt] = {};
    }
  }

  for (const a of answers) {
    if (a && typeof a === "object" && !Array.isArray(a)) {
      const record = a as Record<string, unknown>;
      for (const [stmt, val] of Object.entries(record)) {
        if (!result[stmt]) result[stmt] = {};
        const key = String(val);
        result[stmt][key] = (result[stmt][key] || 0) + 1;
      }
    }
  }

  return result;
}

function aggregateRanking(answers: unknown[]): Record<string, number> {
  const sumPositions: Record<string, number> = {};
  const countPositions: Record<string, number> = {};

  for (const a of answers) {
    if (Array.isArray(a)) {
      a.forEach((item, index) => {
        if (typeof item === "string") {
          sumPositions[item] = (sumPositions[item] || 0) + (index + 1);
          countPositions[item] = (countPositions[item] || 0) + 1;
        }
      });
    }
  }

  const avgPositions: Record<string, number> = {};
  for (const key of Object.keys(sumPositions)) {
    avgPositions[key] = Math.round((sumPositions[key] / countPositions[key]) * 100) / 100;
  }
  return avgPositions;
}

function aggregateDate(answers: unknown[]): { min: string | null; max: string | null } {
  const dates = answers
    .filter((a): a is string => typeof a === "string")
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return { min: null, max: null };
  return {
    min: dates[0].toISOString(),
    max: dates[dates.length - 1].toISOString(),
  };
}

function aggregateText(answers: unknown[]): { count: number } {
  return { count: answers.filter((a) => typeof a === "string" && a.length > 0).length };
}

function aggregateQuestion(question: SurveyQuestion, answers: unknown[]): unknown {
  switch (question.type) {
    case "choice":
      return aggregateChoice(answers, resolveOptionValues(question.options));
    case "multi_choice":
      return aggregateMultiChoice(answers, resolveOptionValues(question.options));
    case "rating":
      return aggregateRating(answers);
    case "nps":
      return aggregateNps(answers);
    case "likert":
      return aggregateLikert(answers, resolveOptionValues(question.statements));
    case "ranking":
      return aggregateRanking(answers);
    case "date":
      return aggregateDate(answers);
    case "text":
    case "long_text":
      return aggregateText(answers);
    case "section":
      return null;
    default:
      return { count: answers.length };
  }
}

export async function getAggregatedResults(surveyId: string) {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) throw new AppError(404, "Survey not found");

  const schema = survey.schema as unknown as SurveySchemaDefinition;
  const responses = await prisma.surveyResponse.findMany({ where: { surveyId } });

  // Collect answers per question
  const answersByQuestion: Record<string, unknown[]> = {};
  for (const q of schema.questions) {
    answersByQuestion[q.id] = [];
  }

  for (const response of responses) {
    const answers = response.answers as Record<string, unknown>;
    for (const q of schema.questions) {
      if (answers[q.id] !== undefined) {
        answersByQuestion[q.id].push(answers[q.id]);
      }
    }
  }

  // Skip non-public questions — their answers are never on the server
  // accessLevel === 5 is public; private === true (legacy) means accessLevel 0
  const results: AggregatedQuestion[] = schema.questions
    .filter((q) => {
      const level = q.accessLevel ?? (q.private ? 0 : 5);
      return level === 5 && q.type !== "section";
    })
    .map((q) => {
      const hasOptions = q.type === "choice" || q.type === "multi_choice" || q.type === "ranking";
      return {
        questionId: q.id,
        type: q.type,
        label: q.label,
        responseCount: answersByQuestion[q.id]?.length ?? 0,
        data: aggregateQuestion(q, answersByQuestion[q.id] ?? []),
        ...(hasOptions && q.options ? { options: resolveOptionMeta(q.options) } : {}),
      };
    });

  // Build monthly response counts for trend chart
  const responseDates: Record<string, number> = {};
  for (const r of responses) {
    const d = new Date(r.submittedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    responseDates[key] = (responseDates[key] || 0) + 1;
  }

  return {
    surveyId,
    title: survey.title,
    version: survey.version,
    totalResponses: responses.length,
    createdAt: survey.createdAt.toISOString(),
    responsesByMonth: responseDates,
    questions: results,
  };
}
