"use client";

import { Suspense, useEffect, useState, useCallback, useMemo, lazy } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  Circle,
  AlertCircle,
  Eye,
  Sparkles,
  Palette,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSurveyById,
  updateSurvey,
  getThemes,
  type Survey,
  type FormChannel,
  type SurveyTheme,
  type ThemeConfig,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { FormPreview } from "./form-preview";
import { AiSurveyPanel } from "@/components/ai-survey-panel";
import { SkeletonPage } from "@/components/skeleton-page";

// ── Types ────────────────────────────────────────────────────────────

type LangCode = string;
type I18nMap = Record<LangCode, string>;

interface QuestionOption {
  value: string;
  label: I18nMap;
}

interface QuestionState {
  id: string;
  type: string;
  label: I18nMap;
  description: I18nMap;
  required: boolean;
  private: boolean;
  options: QuestionOption[];
  statements: QuestionOption[];
  min?: number;
  max?: number;
  minLabel: I18nMap;
  maxLabel: I18nMap;
  showIf?: unknown;
}

// ── Constants ────────────────────────────────────────────────────────

const AVAILABLE_LANGUAGES = [
  { code: "it", name: "Italiano" },
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "ro", name: "Română" },
  { code: "ar", name: "العربية" },
  { code: "zh", name: "中文" },
  { code: "uk", name: "Українська" },
];

const QUESTION_TYPES = [
  { value: "text", label: "Testo breve" },
  { value: "long_text", label: "Testo lungo" },
  { value: "choice", label: "Scelta singola" },
  { value: "multi_choice", label: "Scelta multipla" },
  { value: "rating", label: "Valutazione" },
  { value: "nps", label: "NPS" },
  { value: "likert", label: "Likert" },
  { value: "ranking", label: "Ordinamento" },
  { value: "date", label: "Data" },
  { value: "section", label: "Sezione" },
];

const TYPES_WITH_OPTIONS = ["choice", "multi_choice", "ranking"];
const TYPES_WITH_RANGE = ["rating", "nps"];
const TYPES_WITH_STATEMENTS = ["likert"];

const textareaClasses =
  "min-h-[60px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// ── Helpers ──────────────────────────────────────────────────────────

function emptyI18n(langs: string[]): I18nMap {
  const m: I18nMap = {};
  for (const l of langs) m[l] = "";
  return m;
}

function toI18n(val: unknown, langs: string[]): I18nMap {
  const base = emptyI18n(langs);
  if (typeof val === "string") {
    for (const l of langs) base[l] = val;
    return base;
  }
  if (typeof val === "object" && val !== null) {
    const m = val as Record<string, string>;
    for (const l of langs) base[l] = m[l] ?? "";
    return base;
  }
  return base;
}

function detectLanguages(schema: Record<string, unknown>): string[] {
  const found = new Set<string>();
  function walk(v: unknown) {
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;
      // Heuristic: if all keys are 2-3 char lang codes and values are strings
      const keys = Object.keys(obj);
      if (
        keys.length >= 1 &&
        keys.every((k) => k.length <= 3 && typeof obj[k] === "string")
      ) {
        const knownCodes = AVAILABLE_LANGUAGES.map((l) => l.code);
        const matchedKeys = keys.filter((k) => knownCodes.includes(k));
        if (matchedKeys.length === keys.length && matchedKeys.length > 0) {
          for (const k of matchedKeys) found.add(k);
          return;
        }
      }
      for (const val of Object.values(obj)) walk(val);
    }
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
    }
  }
  walk(schema);
  if (found.size === 0) return ["it"];
  // Keep stable order based on AVAILABLE_LANGUAGES
  return AVAILABLE_LANGUAGES.map((l) => l.code).filter((c) => found.has(c));
}

function parseOption(opt: unknown, langs: string[]): QuestionOption {
  if (typeof opt === "string")
    return { value: opt, label: toI18n(opt, langs) };
  if (typeof opt === "object" && opt !== null) {
    const o = opt as Record<string, unknown>;
    return {
      value: (o.value as string) ?? "",
      label: toI18n(o.label, langs),
    };
  }
  return { value: "", label: emptyI18n(langs) };
}

function parseQuestion(
  q: Record<string, unknown>,
  langs: string[],
): QuestionState {
  return {
    id: (q.id as string) ?? "",
    type: (q.type as string) ?? "text",
    label: toI18n(q.label, langs),
    description: toI18n(q.description, langs),
    required: (q.required as boolean) ?? false,
    private: (q.private as boolean) ?? false,
    options: Array.isArray(q.options)
      ? q.options.map((o) => parseOption(o, langs))
      : [],
    statements: Array.isArray(q.statements)
      ? q.statements.map((s) => parseOption(s, langs))
      : [],
    min: q.min as number | undefined,
    max: q.max as number | undefined,
    minLabel: toI18n(q.minLabel, langs),
    maxLabel: toI18n(q.maxLabel, langs),
    showIf: q.showIf,
  };
}

function questionToSchema(q: QuestionState): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: q.id,
    type: q.type,
    label: { ...q.label },
    required: q.required,
  };
  if (q.private) out.private = true;
  if (Object.values(q.description).some((v) => v))
    out.description = { ...q.description };
  if (TYPES_WITH_OPTIONS.includes(q.type) && q.options.length > 0) {
    out.options = q.options.map((o) => ({
      value: o.value,
      label: { ...o.label },
    }));
  }
  if (TYPES_WITH_STATEMENTS.includes(q.type) && q.statements.length > 0) {
    out.statements = q.statements.map((s) => ({
      value: s.value,
      label: { ...s.label },
    }));
  }
  if (TYPES_WITH_RANGE.includes(q.type)) {
    if (q.min !== undefined) out.min = q.min;
    if (q.max !== undefined) out.max = q.max;
    if (Object.values(q.minLabel).some((v) => v))
      out.minLabel = { ...q.minLabel };
    if (Object.values(q.maxLabel).some((v) => v))
      out.maxLabel = { ...q.maxLabel };
  }
  if (q.showIf) out.showIf = q.showIf;
  return out;
}

/** Check if a text field has content in the primary language but is empty in current. */
function isMissingTranslation(
  map: I18nMap,
  activeLang: string,
  primaryLang: string,
): boolean {
  if (activeLang === primaryLang) return false;
  return !!map[primaryLang] && !map[activeLang];
}

/** Compute completion status for a language across all translatable fields. */
function langCompletionStatus(
  title: I18nMap,
  desc: I18nMap,
  btnLabel: I18nMap,
  btnDesc: I18nMap,
  questions: QuestionState[],
  lang: string,
  primaryLang: string,
): "complete" | "partial" | "empty" {
  if (lang === primaryLang) {
    // Primary: complete if title has content
    return title[lang] ? "complete" : "empty";
  }

  // Collect all fields that have content in primary
  const fields: string[] = [];
  const filled: string[] = [];

  if (title[primaryLang]) {
    fields.push("title");
    if (title[lang]) filled.push("title");
  }
  if (desc[primaryLang]) {
    fields.push("desc");
    if (desc[lang]) filled.push("desc");
  }
  if (btnLabel[primaryLang]) {
    fields.push("btnLabel");
    if (btnLabel[lang]) filled.push("btnLabel");
  }
  if (btnDesc[primaryLang]) {
    fields.push("btnDesc");
    if (btnDesc[lang]) filled.push("btnDesc");
  }

  for (const q of questions) {
    if (q.label[primaryLang]) {
      fields.push(`q-${q.id}-label`);
      if (q.label[lang]) filled.push(`q-${q.id}-label`);
    }
    if (q.description[primaryLang]) {
      fields.push(`q-${q.id}-desc`);
      if (q.description[lang]) filled.push(`q-${q.id}-desc`);
    }
    for (const opt of q.options) {
      if (opt.label[primaryLang]) {
        fields.push(`q-${q.id}-opt-${opt.value}`);
        if (opt.label[lang]) filled.push(`q-${q.id}-opt-${opt.value}`);
      }
    }
    for (const st of q.statements) {
      if (st.label[primaryLang]) {
        fields.push(`q-${q.id}-st-${st.value}`);
        if (st.label[lang]) filled.push(`q-${q.id}-st-${st.value}`);
      }
    }
  }

  if (fields.length === 0) return "empty";
  if (filled.length === fields.length) return "complete";
  if (filled.length === 0) return "empty";
  return "partial";
}

// ── Page wrapper ─────────────────────────────────────────────────────

export default function SurveyEditPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <SurveyEditContent />
    </Suspense>
  );
}

// ── Main editor ─────────────────────────────────────────────────────

function SurveyEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("surveyId");

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Languages
  const [languages, setLanguages] = useState<string[]>(["it"]);
  const [activeLang, setActiveLang] = useState("it");
  const primaryLang = languages[0];

  // Metadata (i18n maps keyed by lang code)
  const [title, setTitle] = useState<I18nMap>({});
  const [desc, setDesc] = useState<I18nMap>({});
  const [btnLabel, setBtnLabel] = useState<I18nMap>({});
  const [btnDesc, setBtnDesc] = useState<I18nMap>({});
  const [channel, setChannel] = useState<FormChannel | "">("");

  // Questions
  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // JSON toggle
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Add language UI
  const [showAddLang, setShowAddLang] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // AI panel
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Theme
  const [themes, setThemes] = useState<SurveyTheme[]>([]);
  const [themeId, setThemeId] = useState<string | null>(null);

  const selectedThemeConfig = useMemo<ThemeConfig | null>(() => {
    if (!themeId) return null;
    const found = themes.find((t) => t.id === themeId);
    return found ? found.config : null;
  }, [themeId, themes]);

  // ── Load survey ────────────────────────────────────────────────────

  const loadSurvey = useCallback(async () => {
    if (!surveyId) {
      setError("Parametro surveyId mancante");
      setLoading(false);
      return;
    }
    try {
      const s = await getSurveyById(surveyId);
      setSurvey(s);
      populateForm(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadSurvey();
  }, [router, loadSurvey]);

  function populateForm(s: Survey) {
    const schema = s.schema as Record<string, unknown>;
    const langs = detectLanguages(schema);
    setLanguages(langs);
    setActiveLang(langs[0]);

    setTitle(toI18n(schema.title, langs));
    setDesc(toI18n(schema.description, langs));
    setBtnLabel(toI18n(schema.buttonLabel, langs));
    setBtnDesc(toI18n(schema.buttonDescription, langs));
    setChannel(s.channel ?? "");
    setThemeId(s.themeId ?? null);

    // Fetch themes for the org
    getThemes(s.orgId)
      .then((res) => setThemes(res.themes))
      .catch(() => {});

    const qs = Array.isArray(schema.questions)
      ? (schema.questions as Record<string, unknown>[]).map((q) =>
          parseQuestion(q, langs),
        )
      : [];
    setQuestions(qs);
  }

  // ── Add / remove language ─────────────────────────────────────────

  function addLanguage(code: string) {
    if (languages.includes(code)) return;
    const newLangs = [...languages, code];
    setLanguages(newLangs);
    // Extend all i18n maps
    setTitle((prev) => ({ ...prev, [code]: "" }));
    setDesc((prev) => ({ ...prev, [code]: "" }));
    setBtnLabel((prev) => ({ ...prev, [code]: "" }));
    setBtnDesc((prev) => ({ ...prev, [code]: "" }));
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        label: { ...q.label, [code]: "" },
        description: { ...q.description, [code]: "" },
        minLabel: { ...q.minLabel, [code]: "" },
        maxLabel: { ...q.maxLabel, [code]: "" },
        options: q.options.map((o) => ({
          ...o,
          label: { ...o.label, [code]: "" },
        })),
        statements: q.statements.map((s) => ({
          ...s,
          label: { ...s.label, [code]: "" },
        })),
      })),
    );
    setActiveLang(code);
    setShowAddLang(false);
  }

  function removeLanguage(code: string) {
    if (code === primaryLang || languages.length <= 1) return;
    const newLangs = languages.filter((l) => l !== code);
    setLanguages(newLangs);
    if (activeLang === code) setActiveLang(newLangs[0]);
    // Clean maps
    const strip = (m: I18nMap) => {
      const next = { ...m };
      delete next[code];
      return next;
    };
    setTitle(strip);
    setDesc(strip);
    setBtnLabel(strip);
    setBtnDesc(strip);
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        label: strip(q.label),
        description: strip(q.description),
        minLabel: strip(q.minLabel),
        maxLabel: strip(q.maxLabel),
        options: q.options.map((o) => ({ ...o, label: strip(o.label) })),
        statements: q.statements.map((s) => ({ ...s, label: strip(s.label) })),
      })),
    );
  }

  // ── Build schema ──────────────────────────────────────────────────

  function buildSchema(): Record<string, unknown> {
    const schema: Record<string, unknown> = {
      title: { ...title },
      questions: questions.map(questionToSchema),
    };
    if (Object.values(desc).some((v) => v)) schema.description = { ...desc };
    if (Object.values(btnLabel).some((v) => v))
      schema.buttonLabel = { ...btnLabel };
    if (Object.values(btnDesc).some((v) => v))
      schema.buttonDescription = { ...btnDesc };
    return schema;
  }

  // ── JSON view ─────────────────────────────────────────────────────

  function openJsonView() {
    setJsonText(JSON.stringify(buildSchema(), null, 2));
    setJsonError(null);
    setShowJson(true);
  }

  function applySurveyFromSchema(schema: Record<string, unknown>) {
    const langs = detectLanguages(schema);
    setLanguages(langs);
    setActiveLang(langs[0]);
    setTitle(toI18n(schema.title, langs));
    setDesc(toI18n(schema.description, langs));
    setBtnLabel(toI18n(schema.buttonLabel, langs));
    setBtnDesc(toI18n(schema.buttonDescription, langs));
    setQuestions(
      Array.isArray(schema.questions)
        ? (schema.questions as Record<string, unknown>[]).map((q) =>
            parseQuestion(q, langs),
          )
        : [],
    );
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      applySurveyFromSchema(parsed);
      setJsonError(null);
      setShowJson(false);
    } catch {
      setJsonError("JSON non valido");
    }
  }

  // ── Save ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!surveyId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const schema = buildSchema();
      await updateSurvey(surveyId, {
        title: title[primaryLang] || survey?.title,
        description:
          Object.values(desc).find((v) => v) || undefined,
        schema,
        channel: channel ? (channel as FormChannel) : null,
        themeId,
      });
      router.push("/rpg/surveys");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Errore nel salvataggio",
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Question mutators ─────────────────────────────────────────────

  function updateQuestion(idx: number, patch: Partial<QuestionState>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  }

  function setI18nField(
    idx: number,
    field: "label" | "description" | "minLabel" | "maxLabel",
    value: string,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === idx ? { ...q, [field]: { ...q[field], [activeLang]: value } } : q,
      ),
    );
  }

  function addQuestion() {
    const nextId = `q${questions.length + 1}`;
    setQuestions((prev) => [
      ...prev,
      {
        id: nextId,
        type: "text",
        label: emptyI18n(languages),
        description: emptyI18n(languages),
        required: false,
        private: false,
        options: [],
        statements: [],
        minLabel: emptyI18n(languages),
        maxLabel: emptyI18n(languages),
      },
    ]);
    setExpandedIdx(questions.length);
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setExpandedIdx(target);
  }

  // ── Option mutators ───────────────────────────────────────────────

  function setOptionLabel(
    qIdx: number,
    field: "options" | "statements",
    oIdx: number,
    value: string,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const arr = [...q[field]];
        arr[oIdx] = {
          ...arr[oIdx],
          label: { ...arr[oIdx].label, [activeLang]: value },
        };
        return { ...q, [field]: arr };
      }),
    );
  }

  function setOptionValue(
    qIdx: number,
    field: "options" | "statements",
    oIdx: number,
    value: string,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const arr = [...q[field]];
        arr[oIdx] = { ...arr[oIdx], value };
        return { ...q, [field]: arr };
      }),
    );
  }

  function addOption(qIdx: number, field: "options" | "statements") {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          [field]: [
            ...q[field],
            { value: "", label: emptyI18n(languages) },
          ],
        };
      }),
    );
  }

  function removeOption(
    qIdx: number,
    field: "options" | "statements",
    oIdx: number,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        return { ...q, [field]: q[field].filter((_, j) => j !== oIdx) };
      }),
    );
  }

  // ── Computed ──────────────────────────────────────────────────────

  const langName = (code: string) =>
    AVAILABLE_LANGUAGES.find((l) => l.code === code)?.name ?? code;

  const availableToAdd = AVAILABLE_LANGUAGES.filter(
    (l) => !languages.includes(l.code),
  );

  const completionStatuses = useMemo(
    () =>
      Object.fromEntries(
        languages.map((l) => [
          l,
          langCompletionStatus(
            title,
            desc,
            btnLabel,
            btnDesc,
            questions,
            l,
            primaryLang,
          ),
        ]),
      ),
    [title, desc, btnLabel, btnDesc, questions, languages, primaryLang],
  );

  /** CSS class for missing-translation border */
  const missingClass = (map: I18nMap) =>
    isMissingTranslation(map, activeLang, primaryLang)
      ? "border-amber-400 ring-1 ring-amber-400/30"
      : "";

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return <SkeletonPage />;
  }

  if (error || !survey) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>{error ?? "Modulo non trovato"}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => router.push("/rpg/surveys")}
            >
              Torna ai moduli
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Sticky toolbar ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-semibold">
              {title[primaryLang] || survey.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              v{survey.version} &middot; {survey.status}
            </p>
          </div>

          {/* Language tabs */}
          <div className="flex items-center gap-1">
            <Globe className="mr-1 h-4 w-4 text-muted-foreground" />
            {languages.map((lang) => {
              const status = completionStatuses[lang];
              const isActive = activeLang === lang;
              const dotColor =
                status === "complete"
                  ? "text-green-500"
                  : status === "partial"
                    ? "text-amber-500"
                    : "text-muted-foreground/40";
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Circle
                    className={`h-2 w-2 fill-current ${isActive ? "text-primary-foreground" : dotColor}`}
                  />
                  {lang.toUpperCase()}
                  {lang === primaryLang && (
                    <span className="text-[10px] opacity-60">*</span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowAddLang(!showAddLang)}
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title="Aggiungi lingua"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              Anteprima
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/rpg/surveys")}
            >
              Annulla
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva"}
            </Button>
          </div>
        </div>

        {/* Add language dropdown */}
        {showAddLang && availableToAdd.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {availableToAdd.map((l) => (
              <Button
                key={l.code}
                size="sm"
                variant="outline"
                onClick={() => addLanguage(l.code)}
              >
                {l.name} ({l.code.toUpperCase()})
              </Button>
            ))}
          </div>
        )}

        {/* Missing translation hint */}
        {activeLang !== primaryLang &&
          completionStatuses[activeLang] !== "complete" && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            I campi con bordo arancione hanno testo in{" "}
            {langName(primaryLang)} ma mancano in {langName(activeLang)}
            {languages.length > 1 && activeLang !== primaryLang && (
              <button
                type="button"
                onClick={() => removeLanguage(activeLang)}
                className="ml-auto text-xs text-destructive hover:underline"
              >
                Rimuovi {langName(activeLang)}
              </button>
            )}
          </div>
        )}
      </div>

      {saveError && (
        <Card className="mb-4 border-destructive/50 bg-destructive/5">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{saveError}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Metadata ──────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Metadati</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Titolo</Label>
            <Input
              value={title[activeLang] ?? ""}
              onChange={(e) =>
                setTitle((prev) => ({ ...prev, [activeLang]: e.target.value }))
              }
              className={missingClass(title)}
              placeholder={
                activeLang !== primaryLang && title[primaryLang]
                  ? `${title[primaryLang]} (${langName(primaryLang)})`
                  : undefined
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descrizione</Label>
            <textarea
              className={`${textareaClasses} ${missingClass(desc)}`}
              value={desc[activeLang] ?? ""}
              onChange={(e) =>
                setDesc((prev) => ({ ...prev, [activeLang]: e.target.value }))
              }
              rows={2}
              placeholder={
                activeLang !== primaryLang && desc[primaryLang]
                  ? `${desc[primaryLang]} (${langName(primaryLang)})`
                  : "Opzionale"
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Etichetta bottone</Label>
              <Input
                value={btnLabel[activeLang] ?? ""}
                onChange={(e) =>
                  setBtnLabel((prev) => ({
                    ...prev,
                    [activeLang]: e.target.value,
                  }))
                }
                className={missingClass(btnLabel)}
                placeholder={
                  activeLang !== primaryLang && btnLabel[primaryLang]
                    ? `${btnLabel[primaryLang]} (${langName(primaryLang)})`
                    : "Opzionale"
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Descrizione bottone</Label>
              <Input
                value={btnDesc[activeLang] ?? ""}
                onChange={(e) =>
                  setBtnDesc((prev) => ({
                    ...prev,
                    [activeLang]: e.target.value,
                  }))
                }
                className={missingClass(btnDesc)}
                placeholder={
                  activeLang !== primaryLang && btnDesc[primaryLang]
                    ? `${btnDesc[primaryLang]} (${langName(primaryLang)})`
                    : "Opzionale"
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Canale (opzionale)</Label>
              <Select
                value={channel || "none"}
                onValueChange={(v) => setChannel(v === "none" ? "" : v as FormChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  <SelectItem value="PDR125">PdR 125</SelectItem>
                  <SelectItem value="WHISTLEBLOWING">
                    Whistleblowing
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Tema
              </Label>
              <Select
                value={themeId ?? "none"}
                onValueChange={(v) => setThemeId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nessun tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun tema</SelectItem>
                  {themes.filter((t) => t.isBuiltin).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Predefiniti
                      </div>
                      {themes.filter((t) => t.isBuiltin).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full border"
                              style={{ backgroundColor: t.config.colors.primary }}
                            />
                            {t.name}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {themes.filter((t) => !t.isBuiltin).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        I miei temi
                      </div>
                      {themes.filter((t) => !t.isBuiltin).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full border"
                              style={{ backgroundColor: t.config.colors.primary }}
                            />
                            {t.name}
                          </span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Questions header ──────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Domande ({questions.length})
        </h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAiPanel((v) => !v)}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            AI
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => (showJson ? applyJson() : openJsonView())}
          >
            {showJson ? "Applica JSON" : "JSON avanzato"}
          </Button>
          <Button size="sm" onClick={addQuestion}>
            <Plus className="mr-1 h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      </div>

      {/* JSON editor */}
      {showJson && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <textarea
              className={`min-h-[300px] w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-sm ${textareaClasses}`}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
            {jsonError && (
              <p className="mt-2 text-sm text-destructive">{jsonError}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={applyJson}>
                Applica
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowJson(false)}
              >
                Chiudi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Question cards ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {questions.map((q, idx) => {
          const isExpanded = expandedIdx === idx;
          const typeLabel =
            QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type;
          const displayLabel =
            q.label[activeLang] || q.label[primaryLang] || "(senza titolo)";

          return (
            <Card key={idx}>
              {/* Collapsed header */}
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              >
                <span className="text-xs font-bold text-muted-foreground">
                  #{idx + 1}
                </span>
                <span className="text-xs text-muted-foreground">{q.id}</span>
                <Badge variant="outline" className="text-xs">
                  {typeLabel}
                </Badge>
                <span className="flex-1 truncate text-sm">{displayLabel}</span>
                {isMissingTranslation(q.label, activeLang, primaryLang) && (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                )}
                {q.required && (
                  <Badge variant="secondary" className="text-xs">
                    Obbligatoria
                  </Badge>
                )}
                {q.private && (
                  <Badge variant="destructive" className="text-xs">
                    Privata
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Expanded */}
              {isExpanded && (
                <CardContent className="flex flex-col gap-4 border-t pt-4">
                  {/* ID + Type */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <Label>ID</Label>
                      <Input
                        value={q.id}
                        onChange={(e) =>
                          updateQuestion(idx, { id: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Tipo</Label>
                      <Select
                        value={q.type}
                        onValueChange={(v) => {
                          if (v) updateQuestion(idx, { type: v });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-4 pb-0.5">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) =>
                            updateQuestion(idx, {
                              required: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-input"
                        />
                        Obbligatoria
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={q.private}
                          onChange={(e) =>
                            updateQuestion(idx, {
                              private: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-input"
                        />
                        Privata
                      </label>
                    </div>
                  </div>

                  {/* Label */}
                  <div className="flex flex-col gap-1.5">
                    <Label>Etichetta</Label>
                    <Input
                      value={q.label[activeLang] ?? ""}
                      onChange={(e) =>
                        setI18nField(idx, "label", e.target.value)
                      }
                      className={missingClass(q.label)}
                      placeholder={
                        activeLang !== primaryLang && q.label[primaryLang]
                          ? `${q.label[primaryLang]} (${langName(primaryLang)})`
                          : undefined
                      }
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <Label>Descrizione</Label>
                    <Input
                      value={q.description[activeLang] ?? ""}
                      onChange={(e) =>
                        setI18nField(idx, "description", e.target.value)
                      }
                      className={missingClass(q.description)}
                      placeholder={
                        activeLang !== primaryLang &&
                        q.description[primaryLang]
                          ? `${q.description[primaryLang]} (${langName(primaryLang)})`
                          : "Opzionale"
                      }
                    />
                  </div>

                  {/* Options (choice/multi_choice/ranking) */}
                  {TYPES_WITH_OPTIONS.includes(q.type) && (
                    <div className="flex flex-col gap-2">
                      <Label>Opzioni</Label>
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="flex items-center gap-2"
                        >
                          <Input
                            className="w-28 shrink-0"
                            placeholder="Valore"
                            value={opt.value}
                            onChange={(e) =>
                              setOptionValue(
                                idx,
                                "options",
                                oIdx,
                                e.target.value,
                              )
                            }
                          />
                          <Input
                            className={`flex-1 ${missingClass(opt.label)}`}
                            placeholder={
                              activeLang !== primaryLang &&
                              opt.label[primaryLang]
                                ? `${opt.label[primaryLang]} (${langName(primaryLang)})`
                                : "Etichetta"
                            }
                            value={opt.label[activeLang] ?? ""}
                            onChange={(e) =>
                              setOptionLabel(
                                idx,
                                "options",
                                oIdx,
                                e.target.value,
                              )
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              removeOption(idx, "options", oIdx)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addOption(idx, "options")}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Aggiungi opzione
                      </Button>
                    </div>
                  )}

                  {/* Statements (likert) */}
                  {TYPES_WITH_STATEMENTS.includes(q.type) && (
                    <div className="flex flex-col gap-2">
                      <Label>Affermazioni</Label>
                      {q.statements.map((st, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center gap-2"
                        >
                          <Input
                            className="w-28 shrink-0"
                            placeholder="Valore"
                            value={st.value}
                            onChange={(e) =>
                              setOptionValue(
                                idx,
                                "statements",
                                sIdx,
                                e.target.value,
                              )
                            }
                          />
                          <Input
                            className={`flex-1 ${missingClass(st.label)}`}
                            placeholder={
                              activeLang !== primaryLang &&
                              st.label[primaryLang]
                                ? `${st.label[primaryLang]} (${langName(primaryLang)})`
                                : "Etichetta"
                            }
                            value={st.label[activeLang] ?? ""}
                            onChange={(e) =>
                              setOptionLabel(
                                idx,
                                "statements",
                                sIdx,
                                e.target.value,
                              )
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              removeOption(idx, "statements", sIdx)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addOption(idx, "statements")}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Aggiungi affermazione
                      </Button>
                    </div>
                  )}

                  {/* Range (rating/nps) */}
                  {TYPES_WITH_RANGE.includes(q.type) && (
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="flex flex-col gap-1.5">
                        <Label>Min</Label>
                        <Input
                          type="number"
                          value={q.min ?? ""}
                          onChange={(e) =>
                            updateQuestion(idx, {
                              min: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Max</Label>
                        <Input
                          type="number"
                          value={q.max ?? ""}
                          onChange={(e) =>
                            updateQuestion(idx, {
                              max: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Etichetta min</Label>
                        <Input
                          value={q.minLabel[activeLang] ?? ""}
                          onChange={(e) =>
                            setI18nField(idx, "minLabel", e.target.value)
                          }
                          className={missingClass(q.minLabel)}
                          placeholder={
                            activeLang !== primaryLang &&
                            q.minLabel[primaryLang]
                              ? `${q.minLabel[primaryLang]} (${langName(primaryLang)})`
                              : "Opzionale"
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Etichetta max</Label>
                        <Input
                          value={q.maxLabel[activeLang] ?? ""}
                          onChange={(e) =>
                            setI18nField(idx, "maxLabel", e.target.value)
                          }
                          className={missingClass(q.maxLabel)}
                          placeholder={
                            activeLang !== primaryLang &&
                            q.maxLabel[primaryLang]
                              ? `${q.maxLabel[primaryLang]} (${langName(primaryLang)})`
                              : "Opzionale"
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* showIf (readonly) */}
                  {q.showIf ? (
                    <div className="flex flex-col gap-1.5">
                      <Label>showIf (sola lettura)</Label>
                      <pre className="overflow-auto rounded-lg bg-muted p-2 text-xs">
                        {JSON.stringify(q.showIf, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={idx === 0}
                      onClick={() => moveQuestion(idx, -1)}
                    >
                      <ArrowUp className="mr-1 h-3 w-3" />
                      Su
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={idx === questions.length - 1}
                      onClick={() => moveQuestion(idx, 1)}
                    >
                      <ArrowDown className="mr-1 h-3 w-3" />
                      Giù
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeQuestion(idx)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Elimina
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {questions.length === 0 && (
        <Card className="mt-2 text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground">
              Nessuna domanda. Clicca &quot;Aggiungi&quot; per iniziare.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bottom save bar */}
      <div className="mt-6 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="mr-1 h-4 w-4" />
          Anteprima
        </Button>
        <Button variant="outline" onClick={() => router.push("/rpg/surveys")}>
          Annulla
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvataggio..." : "Salva"}
        </Button>
      </div>

      {/* Preview overlay */}
      {showPreview && (
        <FormPreview
          title={title}
          description={desc}
          buttonLabel={btnLabel}
          questions={questions}
          languages={languages}
          activeLang={activeLang}
          themeConfig={selectedThemeConfig}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* AI Assistant panel */}
      <AiSurveyPanel
        open={showAiPanel}
        onClose={() => setShowAiPanel(false)}
        onApplySchema={applySurveyFromSchema}
        currentSchema={buildSchema()}
      />
    </div>
  );
}
