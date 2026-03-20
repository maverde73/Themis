"use client";

import { useState, useCallback, useMemo } from "react";
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

// ── Component ────────────────────────────────────────────────────────

export function FormPreview({
  title,
  description,
  buttonLabel,
  questions,
  languages,
  activeLang: initialLang,
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl">
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
          <div className="flex gap-2">
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
