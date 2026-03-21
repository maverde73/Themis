"use client";

import type { ThemeConfig, SurveyTheme } from "@/lib/api";
import { useState, useCallback, useMemo } from "react";
import { Palette } from "lucide-react";
import {
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Types ────────────────────────────────────────────────────────────

interface I18nMap {
  [lang: string]: string;
}

interface QuestionOption {
  value: string;
  label: I18nMap;
}

interface ShowIfCondition {
  field?: string;
  op?: string;
  value?: unknown;
  all?: ShowIfCondition[];
  any?: ShowIfCondition[];
}

interface PreviewQuestion {
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

interface FormPreviewProps {
  title: I18nMap;
  description: I18nMap;
  buttonLabel: I18nMap;
  questions: PreviewQuestion[];
  languages: string[];
  activeLang: string;
  themes: SurveyTheme[];
  themeId: string | null;
  onThemeChange: (themeId: string | null) => void;
  onClose: () => void;
}

type Answers = Record<string, unknown>;

// ── showIf evaluator ─────────────────────────────────────────────────

function evaluateCondition(
  condition: ShowIfCondition,
  answers: Answers,
): boolean {
  // Composite conditions
  if (condition.all) {
    return condition.all.every((c) => evaluateCondition(c, answers));
  }
  if (condition.any) {
    return condition.any.some((c) => evaluateCondition(c, answers));
  }

  // Leaf condition
  if (!condition.field || !condition.op) return true;

  const answer = answers[condition.field];
  const expected = condition.value;

  switch (condition.op) {
    case "eq":
      return answer === expected;
    case "neq":
      return answer !== expected;
    case "gt":
      return typeof answer === "number" && typeof expected === "number" && answer > expected;
    case "lt":
      return typeof answer === "number" && typeof expected === "number" && answer < expected;
    case "gte":
      return typeof answer === "number" && typeof expected === "number" && answer >= expected;
    case "lte":
      return typeof answer === "number" && typeof expected === "number" && answer <= expected;
    case "in":
      if (Array.isArray(expected)) return expected.includes(answer);
      return false;
    case "contains":
      // For multi_choice answers (arrays)
      if (Array.isArray(answer)) return answer.includes(expected);
      return answer === expected;
    default:
      return true;
  }
}

function isQuestionVisible(
  question: PreviewQuestion,
  answers: Answers,
): boolean {
  if (!question.showIf) return true;
  return evaluateCondition(question.showIf as ShowIfCondition, answers);
}

// ── Helpers ──────────────────────────────────────────────────────────

function t(map: I18nMap, lang: string): string {
  return map[lang] || Object.values(map).find((v) => v) || "";
}

const textareaClasses =
  "min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

// ── Theme → CSS custom properties ───────────────────────────────────

function themeToCSS(config: ThemeConfig): React.CSSProperties {
  const c = config.colors;
  const ty = config.typography;
  const sp = config.spacing;
  const btn = config.buttons;
  const card = config.card;
  return {
    "--theme-bg": c.pageBackground,
    "--theme-surface": c.surface,
    "--theme-primary": c.primary,
    "--theme-primary-hover": c.primaryHover,
    "--theme-text": c.text,
    "--theme-text-secondary": c.textSecondary,
    "--theme-border": c.border,
    "--theme-error": c.error,
    "--theme-input-bg": c.inputBackground,
    "--theme-input-border": c.inputBorder,
    "--theme-input-focus": c.inputFocus,
    "--theme-required": c.required,
    "--theme-font-family": ty.fontFamily,
    "--theme-font-heading": ty.fontFamilyHeading ?? ty.fontFamily,
    "--theme-title-size": ty.titleSize,
    "--theme-title-weight": String(ty.titleWeight),
    "--theme-subtitle-size": ty.subtitleSize,
    "--theme-label-size": ty.labelSize,
    "--theme-label-weight": String(ty.labelWeight),
    "--theme-body-size": ty.bodySize,
    "--theme-line-height": String(ty.lineHeight),
    "--theme-max-width": sp.formMaxWidth,
    "--theme-padding": sp.formPadding,
    "--theme-border-radius": sp.borderRadius,
    "--theme-input-radius": sp.inputBorderRadius,
    "--theme-field-gap": sp.fieldGap,
    "--theme-btn-bg": btn.backgroundColor,
    "--theme-btn-color": btn.textColor,
    "--theme-btn-hover-bg": btn.hoverBackgroundColor,
    "--theme-btn-radius": btn.borderRadius,
    "--theme-btn-padding": btn.padding,
    "--theme-btn-font-size": btn.fontSize,
    "--theme-btn-font-weight": String(btn.fontWeight),
    "--theme-btn-transform": btn.textTransform,
    "--theme-card-bg": card.backgroundColor,
    "--theme-card-border": card.borderColor,
    "--theme-card-border-width": card.borderWidth,
    "--theme-card-radius": card.borderRadius,
    "--theme-card-shadow": card.shadow,
    "--theme-card-padding": card.padding,
  } as React.CSSProperties;
}

// ── Component ────────────────────────────────────────────────────────

export function FormPreview({
  title,
  description,
  buttonLabel,
  questions,
  languages,
  activeLang: initialLang,
  themes,
  themeId,
  onThemeChange,
  onClose,
}: FormPreviewProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [previewLang, setPreviewLang] = useState(initialLang);

  // ── Visible questions ─────────────────────────────────────────────

  const visibleQuestions = useMemo(
    () => questions.filter((q) => isQuestionVisible(q, answers)),
    [questions, answers],
  );

  // ── Answer setters ────────────────────────────────────────────────

  const setAnswer = useCallback((id: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSubmitted(false);
  }, []);

  const toggleMultiChoice = useCallback(
    (id: string, optionValue: string) => {
      setAnswers((prev) => {
        const current = (prev[id] as string[]) ?? [];
        const next = current.includes(optionValue)
          ? current.filter((v) => v !== optionValue)
          : [...current, optionValue];
        return { ...prev, [id]: next };
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSubmitted(false);
    },
    [],
  );

  // ── Validation ────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const q of visibleQuestions) {
      if (!q.required) continue;
      if (q.type === "section") continue;
      const answer = answers[q.id];
      if (answer === undefined || answer === null || answer === "") {
        newErrors[q.id] = "Campo obbligatorio";
      } else if (Array.isArray(answer) && answer.length === 0) {
        newErrors[q.id] = "Seleziona almeno un'opzione";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (validate()) {
      setSubmitted(true);
    }
  }

  function handleReset() {
    setAnswers({});
    setErrors({});
    setSubmitted(false);
  }

  // ── Branch visualization ──────────────────────────────────────────

  const hiddenByBranch = questions.filter(
    (q) => q.showIf && !isQuestionVisible(q, answers),
  );

  // ── Render ────────────────────────────────────────────────────────

  const themeConfig = useMemo(() => {
    if (!themeId) return null;
    const found = themes.find((t) => t.id === themeId);
    return found ? found.config : null;
  }, [themeId, themes]);

  const themeStyle = themeConfig ? themeToCSS(themeConfig) : undefined;
  const themed = !!themeConfig;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 backdrop-blur-sm"
      style={{
        background: themed
          ? `var(--theme-bg, rgba(0,0,0,0.5))`
          : undefined,
      }}
    >
      <div
        className="my-8 w-full"
        style={{
          maxWidth: themed ? `var(--theme-max-width, 42rem)` : "42rem",
          ...themeStyle,
        }}
      >
        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-background p-3 ring-1 ring-foreground/10">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Anteprima</Badge>
            {/* Language selector */}
            <div className="flex gap-1">
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setPreviewLang(lang)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    previewLang === lang
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme selector */}
            {themes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={themeId ?? ""}
                  onChange={(e) => onThemeChange(e.target.value || null)}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Nessun tema</option>
                  {themes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Success state */}
        {submitted && (
          <Card className="mb-4 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Invio simulato con successo
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Tutti i campi obbligatori sono compilati. Il branching ha
                  funzionato correttamente.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={handleReset}
              >
                Ritesta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Form card */}
        <div
          style={themed ? {
            background: "var(--theme-card-bg)",
            borderColor: "var(--theme-card-border)",
            borderWidth: "var(--theme-card-border-width)",
            borderStyle: "solid",
            borderRadius: "var(--theme-card-radius)",
            boxShadow: "var(--theme-card-shadow)",
            padding: "var(--theme-card-padding)",
            fontFamily: "var(--theme-font-family)",
            color: "var(--theme-text)",
            fontSize: "var(--theme-body-size)",
            lineHeight: "var(--theme-line-height)",
          } : undefined}
          className={themed ? "" : undefined}
        >
          {themed ? (
            <>
              {/* Themed header */}
              <div style={{ marginBottom: "var(--theme-field-gap)" }}>
                <h2 style={{
                  fontSize: "var(--theme-title-size)",
                  fontWeight: "var(--theme-title-weight)" as unknown as number,
                  fontFamily: "var(--theme-font-heading)",
                  color: "var(--theme-text)",
                  margin: 0,
                }}>
                  {t(title, previewLang) || "Senza titolo"}
                </h2>
                {t(description, previewLang) && (
                  <p style={{
                    fontSize: "var(--theme-subtitle-size)",
                    color: "var(--theme-text-secondary)",
                    marginTop: "4px",
                  }}>
                    {t(description, previewLang)}
                  </p>
                )}
              </div>

              {/* Themed questions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--theme-field-gap)" }}>
                {visibleQuestions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    lang={previewLang}
                    answer={answers[q.id]}
                    error={errors[q.id]}
                    onAnswer={setAnswer}
                    onToggleMulti={toggleMultiChoice}
                  />
                ))}
              </div>

              {visibleQuestions.length === 0 && (
                <p style={{ textAlign: "center", color: "var(--theme-text-secondary)", padding: "16px 0" }}>
                  Nessuna domanda visibile con le risposte attuali.
                </p>
              )}

              {/* Themed submit button */}
              <div style={{ marginTop: "var(--theme-field-gap)" }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitted}
                  style={{
                    width: "100%",
                    backgroundColor: "var(--theme-btn-bg)",
                    color: "var(--theme-btn-color)",
                    borderRadius: "var(--theme-btn-radius)",
                    padding: "var(--theme-btn-padding)",
                    fontSize: "var(--theme-btn-font-size)",
                    fontWeight: "var(--theme-btn-font-weight)" as unknown as number,
                    textTransform: "var(--theme-btn-transform)" as React.CSSProperties["textTransform"],
                    border: "none",
                    cursor: submitted ? "default" : "pointer",
                    opacity: submitted ? 0.6 : 1,
                  }}
                >
                  {t(buttonLabel, previewLang) || "Invia"}
                </button>
              </div>

              {Object.keys(errors).length > 0 && (
                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--theme-error)" }}>
                  <AlertCircle className="h-4 w-4" />
                  {Object.keys(errors).length} campo/i obbligatorio/i mancante/i
                </div>
              )}
            </>
          ) : (
            <Card>
              {/* Header */}
              <CardHeader>
                <CardTitle className="text-xl">
                  {t(title, previewLang) || "Senza titolo"}
                </CardTitle>
                {t(description, previewLang) && (
                  <CardDescription className="text-sm">
                    {t(description, previewLang)}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex flex-col gap-6">
                {visibleQuestions.map((q) => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    lang={previewLang}
                    answer={answers[q.id]}
                    error={errors[q.id]}
                    onAnswer={setAnswer}
                    onToggleMulti={toggleMultiChoice}
                  />
                ))}

                {visibleQuestions.length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">
                    Nessuna domanda visibile con le risposte attuali.
                  </p>
                )}
              </CardContent>

              <CardFooter className="flex-col items-stretch gap-3">
                <Button onClick={handleSubmit} disabled={submitted}>
                  {t(buttonLabel, previewLang) || "Invia"}
                </Button>

                {Object.keys(errors).length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {Object.keys(errors).length} campo/i obbligatorio/i mancante/i
                  </div>
                )}
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Branch info panel */}
        {hiddenByBranch.length > 0 && (
          <Card className="mt-4 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Domande nascoste dal branching ({hiddenByBranch.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                {hiddenByBranch.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-mono text-xs">{q.id}</span>
                    <span>{t(q.label, previewLang)}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      showIf: {(q.showIf as ShowIfCondition)?.field ?? "?"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Question field renderer ─────────────────────────────────────────

function QuestionField({
  question,
  lang,
  answer,
  error,
  onAnswer,
  onToggleMulti,
}: {
  question: PreviewQuestion;
  lang: string;
  answer: unknown;
  error?: string;
  onAnswer: (id: string, value: unknown) => void;
  onToggleMulti: (id: string, value: string) => void;
}) {
  const label = t(question.label, lang);
  const desc = t(question.description, lang);
  const errorClasses = error ? "border-destructive ring-1 ring-destructive/30" : "";

  // ── Section ─────────────────────────────────────────────────────

  if (question.type === "section") {
    return (
      <div className="border-t pt-4">
        <h3 className="text-base font-semibold">{label}</h3>
        {desc && (
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="flex items-center gap-1">
        {label}
        {question.required && <span className="text-destructive">*</span>}
        {question.private && (
          <Badge variant="destructive" className="ml-1 text-[10px]">
            Privata
          </Badge>
        )}
      </Label>
      {desc && (
        <p className="text-xs text-muted-foreground">{desc}</p>
      )}

      {/* ── Text ──────────────────────────────────────────────────── */}
      {question.type === "text" && (
        <Input
          className={errorClasses}
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          placeholder="Scrivi qui..."
        />
      )}

      {/* ── Long text ─────────────────────────────────────────────── */}
      {question.type === "long_text" && (
        <textarea
          className={`${textareaClasses} ${errorClasses}`}
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
          placeholder="Scrivi qui..."
          rows={3}
        />
      )}

      {/* ── Choice (radio) ────────────────────────────────────────── */}
      {question.type === "choice" && (
        <div className={`flex flex-col gap-2 rounded-lg border p-3 ${errorClasses}`}>
          {question.options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-sm cursor-pointer"
            >
              <input
                type="radio"
                name={`preview-${question.id}`}
                checked={answer === opt.value}
                onChange={() => onAnswer(question.id, opt.value)}
                className="h-4 w-4 accent-primary"
              />
              {t(opt.label, lang) || opt.value}
            </label>
          ))}
        </div>
      )}

      {/* ── Multi choice (checkbox) ───────────────────────────────── */}
      {question.type === "multi_choice" && (
        <div className={`flex flex-col gap-2 rounded-lg border p-3 ${errorClasses}`}>
          {question.options.map((opt) => {
            const selected = Array.isArray(answer) && answer.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleMulti(question.id, opt.value)}
                  className="h-4 w-4 rounded accent-primary"
                />
                {t(opt.label, lang) || opt.value}
              </label>
            );
          })}
        </div>
      )}

      {/* ── Rating ────────────────────────────────────────────────── */}
      {question.type === "rating" && (
        <div>
          <div className="flex items-center gap-1">
            {Array.from(
              { length: (question.max ?? 5) - (question.min ?? 1) + 1 },
              (_, i) => (question.min ?? 1) + i,
            ).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onAnswer(question.id, val)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                  answer === val
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                } ${error && !answer ? "border-destructive" : ""}`}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{t(question.minLabel, lang)}</span>
            <span>{t(question.maxLabel, lang)}</span>
          </div>
        </div>
      )}

      {/* ── NPS ───────────────────────────────────────────────────── */}
      {question.type === "nps" && (
        <div>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 11 }, (_, i) => i).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onAnswer(question.id, val)}
                className={`flex h-9 flex-1 items-center justify-center rounded border text-xs font-medium transition-colors ${
                  answer === val
                    ? val <= 6
                      ? "border-red-500 bg-red-500 text-white"
                      : val <= 8
                        ? "border-yellow-500 bg-yellow-500 text-white"
                        : "border-green-500 bg-green-500 text-white"
                    : "hover:bg-accent"
                } ${error && answer === undefined ? "border-destructive" : ""}`}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{t(question.minLabel, lang) || "Per niente probabile"}</span>
            <span>{t(question.maxLabel, lang) || "Molto probabile"}</span>
          </div>
        </div>
      )}

      {/* ── Likert ────────────────────────────────────────────────── */}
      {question.type === "likert" && (
        <div className={`flex flex-col gap-3 rounded-lg border p-3 ${errorClasses}`}>
          {question.statements.map((st) => {
            const likertAnswers = (answer as Record<string, number>) ?? {};
            return (
              <div key={st.value}>
                <p className="mb-1.5 text-sm font-medium">
                  {t(st.label, lang) || st.value}
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        onAnswer(question.id, {
                          ...likertAnswers,
                          [st.value]: val,
                        })
                      }
                      className={`flex h-8 flex-1 items-center justify-center rounded border text-xs font-medium transition-colors ${
                        likertAnswers[st.value] === val
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Ranking ───────────────────────────────────────────────── */}
      {question.type === "ranking" && (
        <RankingField
          question={question}
          lang={lang}
          answer={answer}
          error={error}
          onAnswer={onAnswer}
        />
      )}

      {/* ── Date ──────────────────────────────────────────────────── */}
      {question.type === "date" && (
        <Input
          type="date"
          className={errorClasses}
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswer(question.id, e.target.value)}
        />
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ── Ranking with drag-like reorder ──────────────────────────────────

function RankingField({
  question,
  lang,
  answer,
  error,
  onAnswer,
}: {
  question: PreviewQuestion;
  lang: string;
  answer: unknown;
  error?: string;
  onAnswer: (id: string, value: unknown) => void;
}) {
  const items = useMemo(() => {
    if (Array.isArray(answer) && answer.length === question.options.length) {
      return answer as string[];
    }
    return question.options.map((o) => o.value);
  }, [answer, question.options]);

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onAnswer(question.id, next);
  }

  const optionMap = Object.fromEntries(
    question.options.map((o) => [o.value, o]),
  );

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-3 ${error ? "border-destructive ring-1 ring-destructive/30" : ""}`}
    >
      {items.map((value, idx) => {
        const opt = optionMap[value];
        return (
          <div
            key={value}
            className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2"
          >
            <span className="text-xs font-bold text-muted-foreground w-5">
              {idx + 1}.
            </span>
            <span className="flex-1 text-sm">
              {opt ? t(opt.label, lang) : value}
            </span>
            <button
              type="button"
              disabled={idx === 0}
              onClick={() => move(idx, -1)}
              className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5 -rotate-90" />
            </button>
            <button
              type="button"
              disabled={idx === items.length - 1}
              onClick={() => move(idx, 1)}
              className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-90" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
