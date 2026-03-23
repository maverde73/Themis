"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Shield, Send, Radio, Server } from "lucide-react";
import {
  getPublicSurvey,
  getNostrConfig,
  type Survey,
  type ThemeConfig,
} from "@/lib/api";
import { getDecorationSrc, DECORATION_SIZE_MAP } from "@/lib/decorations";
import { submitViaNostro, type SubmitProgress, type SubmitStep } from "@/lib/crypto/nostr-submit";

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

interface SurveyQuestion {
  id: string;
  type: string;
  label: I18nMap;
  description: I18nMap;
  required: boolean;
  private: boolean;
  accessLevel?: number;
  options: QuestionOption[];
  statements: QuestionOption[];
  min?: number;
  max?: number;
  minLabel: I18nMap;
  maxLabel: I18nMap;
  showIf?: unknown;
}

interface SurveySchema {
  title: I18nMap;
  description: I18nMap;
  buttonLabel: I18nMap;
  buttonDescription: I18nMap;
  languages: string[];
  questions: SurveyQuestion[];
}

type Answers = Record<string, unknown>;

// ── Helpers ──────────────────────────────────────────────────────────

function t(map: I18nMap | undefined, lang: string): string {
  if (!map) return "";
  return map[lang] || Object.values(map).find((v) => v) || "";
}

function evaluateCondition(cond: ShowIfCondition, answers: Answers): boolean {
  if (cond.all) return cond.all.every((c) => evaluateCondition(c, answers));
  if (cond.any) return cond.any.some((c) => evaluateCondition(c, answers));
  if (!cond.field || !cond.op) return true;
  const answer = answers[cond.field];
  const expected = cond.value;
  switch (cond.op) {
    case "eq": return answer === expected;
    case "neq": return answer !== expected;
    case "contains":
      if (Array.isArray(answer)) return answer.includes(expected);
      return answer === expected;
    case "in":
      return Array.isArray(expected) && expected.includes(answer);
    default: return true;
  }
}

function themeToCSS(config: ThemeConfig): React.CSSProperties {
  const c = config.colors;
  const ty = config.typography;
  const sp = config.spacing;
  const btn = config.buttons;
  return {
    "--theme-bg": c.pageBackground,
    "--theme-survey-bg": c.surveyBackground ?? "#ffffff",
    "--theme-text": c.text,
    "--theme-text-secondary": c.textSecondary,
    "--theme-border": c.border,
    "--theme-error": c.error,
    "--theme-required": c.required,
    "--theme-input-bg": c.inputBackground,
    "--theme-input-border": c.inputBorder,
    "--theme-input-focus": c.inputFocus,
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
    "--theme-btn-radius": btn.borderRadius,
    "--theme-btn-padding": btn.padding,
    "--theme-btn-font-size": btn.fontSize,
    "--theme-btn-font-weight": String(btn.fontWeight),
    "--theme-btn-transform": btn.textTransform,
    "--theme-card-bg": config.card.backgroundColor,
    "--theme-card-border": config.card.borderColor,
    "--theme-card-border-width": config.card.borderWidth,
    "--theme-card-radius": config.card.borderRadius,
    "--theme-card-shadow": config.card.shadow,
    "--theme-card-padding": config.card.padding,
  } as React.CSSProperties;
}

// ── Page ─────────────────────────────────────────────────────────────

export default function PublicSurveyPage() {
  const params = useParams();
  const id = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<SubmitProgress | null>(null);
  const [lang, setLang] = useState("it");

  const loadSurvey = useCallback(async () => {
    try {
      const s = await getPublicSurvey(id);
      setSurvey(s);
      const schema = s.schema as unknown as SurveySchema;
      if (schema.languages?.length > 0) setLang(schema.languages[0]);
    } catch {
      setError("Sondaggio non trovato o non disponibile.");
    }
  }, [id]);

  useEffect(() => { loadSurvey(); }, [loadSurvey]);

  const schema = useMemo(
    () => (survey?.schema as unknown as SurveySchema) ?? null,
    [survey],
  );

  const questions = useMemo(
    () => schema?.questions ?? [],
    [schema],
  );

  const visibleQuestions = useMemo(
    () => questions.filter((q) => !q.showIf || evaluateCondition(q.showIf as ShowIfCondition, answers)),
    [questions, answers],
  );

  const themeConfig = survey?.theme?.config ?? null;
  const themeStyle = themeConfig ? themeToCSS(themeConfig) : undefined;
  const themed = !!themeConfig;

  const decoration = themeConfig?.decoration;
  const decorationSrc = decoration
    ? getDecorationSrc(decoration.type, decoration.builtinId, decoration.url)
    : null;
  const hasDecoration = !!decoration && decoration.type !== "none" && !!decorationSrc;
  const isBgDecoration = hasDecoration && decoration!.position === "background";
  const cardBgOpacity = themeConfig?.card.backgroundOpacity ?? 1;

  const bgDecorationStyle: React.CSSProperties = isBgDecoration
    ? {
        backgroundImage: `url(${decorationSrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }
    : {};

  function setAnswer(qId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[qId]; return n; });
  }

  function toggleMulti(qId: string, optVal: string) {
    setAnswers((prev) => {
      const curr = (prev[qId] as string[]) ?? [];
      const next = curr.includes(optVal) ? curr.filter((v) => v !== optVal) : [...curr, optVal];
      return { ...prev, [qId]: next };
    });
    setErrors((prev) => { const n = { ...prev }; delete n[qId]; return n; });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const q of visibleQuestions) {
      if (!q.required || q.type === "section") continue;
      const a = answers[q.id];
      if (a === undefined || a === null || a === "") {
        newErrors[q.id] = "Campo obbligatorio";
      } else if (Array.isArray(a) && a.length === 0) {
        newErrors[q.id] = "Seleziona almeno un'opzione";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || !survey) return;
    setSubmitting(true);
    setSubmitProgress({ step: "generating_keys", relayOkCount: 0, totalEvents: 2 });
    try {
      // Split answers by access level: < 5 goes encrypted (private), 5 goes to server (public)
      const privateAnswers: Record<string, unknown> = {};
      const publicAnswers: Record<string, unknown> = {};
      for (const q of visibleQuestions) {
        if (answers[q.id] === undefined) continue;
        const level = q.accessLevel ?? (q.private ? 0 : 5);
        if (level < 5) {
          privateAnswers[q.id] = answers[q.id];
        } else {
          publicAnswers[q.id] = answers[q.id];
        }
      }

      // Get Nostr config from server
      const nostrConfig = await getNostrConfig(survey.id);

      // Submit via Nostr relay
      await submitViaNostro(
        survey.id,
        survey.orgId,
        privateAnswers,
        publicAnswers,
        nostrConfig,
        setSubmitProgress,
      );

      setSubmitted(true);
    } catch {
      setSubmitProgress({ step: "error", relayOkCount: 0, totalEvents: 2, errorMessage: "Errore nell'invio. Riprova." });
      setErrors({ _form: "Errore nell'invio. Riprova." });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / Error ────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="rounded-xl bg-background p-8 text-center shadow-lg">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!survey || !schema) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{
          background: themed ? `var(--theme-bg)` : undefined,
          ...themeStyle,
          ...bgDecorationStyle,
        }}
      >
        <div className="w-full max-w-md rounded-xl bg-background p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="mb-2 text-xl font-semibold">Grazie!</h2>
          <p className="text-muted-foreground">
            La tua risposta è stata inviata con successo.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  const languages = schema.languages ?? ["it"];

  return (
    <div
      className="flex min-h-screen items-start justify-center overflow-y-auto p-4"
      style={{
        background: themed ? `var(--theme-bg)` : undefined,
        ...themeStyle,
        ...bgDecorationStyle,
      }}
    >
      {/* Side decoration */}
      {hasDecoration && decoration!.position !== "background" && (
        <div
          className="fixed top-0 bottom-0 hidden md:block"
          style={{
            [decoration!.position === "left" ? "left" : "right"]: 0,
            width: DECORATION_SIZE_MAP[decoration!.size] ?? "33%",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={decorationSrc!}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: decoration!.opacity }}
          />
        </div>
      )}

      <div
        className="my-8 w-full"
        style={{ maxWidth: themed ? "var(--theme-max-width, 42rem)" : "42rem" }}
      >
        {/* Language selector */}
        {languages.length > 1 && (
          <div className="mb-4 flex justify-end gap-1">
            {languages.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
                  lang === l
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Form card */}
        <div
          style={themed ? {
            position: "relative",
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
            overflow: "hidden",
          } : {
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {/* Background layer */}
          {themed && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--theme-survey-bg, var(--theme-card-bg, #ffffff))",
                opacity: cardBgOpacity,
                pointerEvents: "none",
                borderRadius: "inherit",
              }}
            />
          )}

          <div style={themed ? { position: "relative" } : undefined}>
            {/* Header */}
            <div style={{ marginBottom: themed ? "var(--theme-field-gap)" : "24px" }}>
              <h1 style={themed ? {
                fontSize: "var(--theme-title-size)",
                fontWeight: "var(--theme-title-weight)" as unknown as number,
                fontFamily: "var(--theme-font-heading)",
                margin: 0,
              } : { fontSize: "24px", fontWeight: 700, margin: 0 }}>
                {t(schema.title, lang) || survey.title}
              </h1>
              {t(schema.description, lang) && (
                <p style={{
                  fontSize: themed ? "var(--theme-subtitle-size)" : "14px",
                  color: themed ? "var(--theme-text-secondary)" : "#666",
                  marginTop: "8px",
                }}>
                  {t(schema.description, lang)}
                </p>
              )}
            </div>

            {/* Questions */}
            <div style={{ display: "flex", flexDirection: "column", gap: themed ? "var(--theme-field-gap)" : "24px" }}>
              {visibleQuestions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  lang={lang}
                  answer={answers[q.id]}
                  error={errors[q.id]}
                  themed={themed}
                  onAnswer={setAnswer}
                  onToggleMulti={toggleMulti}
                />
              ))}
            </div>

            {/* Submit */}
            <div style={{ marginTop: themed ? "var(--theme-field-gap)" : "24px" }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={themed ? {
                  width: "100%",
                  background: "var(--theme-btn-bg)",
                  color: "var(--theme-btn-color)",
                  borderRadius: "var(--theme-btn-radius)",
                  padding: "var(--theme-btn-padding)",
                  fontSize: "var(--theme-btn-font-size)",
                  fontWeight: "var(--theme-btn-font-weight)" as unknown as number,
                  textTransform: "var(--theme-btn-transform)" as React.CSSProperties["textTransform"],
                  border: "none",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                } : {
                  width: "100%",
                  background: "#1976d2",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    Invio crittografato in corso...
                  </span>
                ) : t(schema.buttonLabel, lang) || "Invia"}
              </button>
            </div>

            {Object.keys(errors).length > 0 && !submitProgress && (
              <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: themed ? "var(--theme-error)" : "#d32f2f" }}>
                <AlertCircle style={{ width: 16, height: 16 }} />
                {errors._form || `${Object.keys(errors).length} campo/i obbligatorio/i mancante/i`}
              </div>
            )}

            {/* Step-by-step submit progress */}
            {submitProgress && <SubmitStatusBar progress={submitProgress} themed={themed} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Question field ──────────────────────────────────────────────────

function QuestionField({
  question: q,
  lang,
  answer,
  error,
  themed,
  onAnswer,
  onToggleMulti,
}: {
  question: SurveyQuestion;
  lang: string;
  answer: unknown;
  error?: string;
  themed: boolean;
  onAnswer: (id: string, val: unknown) => void;
  onToggleMulti: (id: string, val: string) => void;
}) {
  const label = t(q.label, lang);
  const desc = t(q.description, lang);

  if (q.type === "section") {
    return (
      <div style={{ borderTop: `1px solid ${themed ? "var(--theme-border)" : "#e0e0e0"}`, paddingTop: "16px" }}>
        <h3 style={{ fontSize: themed ? "var(--theme-label-size)" : "16px", fontWeight: 600 }}>{label}</h3>
        {desc && <p style={{ fontSize: "13px", color: themed ? "var(--theme-text-secondary)" : "#666", marginTop: "4px" }}>{desc}</p>}
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: themed ? "var(--theme-input-radius)" : "6px",
    border: `1px solid ${error ? "#d32f2f" : themed ? "var(--theme-input-border)" : "#bdbdbd"}`,
    backgroundColor: themed ? "var(--theme-input-bg)" : "#fff",
    fontSize: themed ? "var(--theme-body-size)" : "14px",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: themed ? "var(--theme-label-size)" : "14px", fontWeight: themed ? "var(--theme-label-weight)" as unknown as number : 600 }}>
        {label}
        {q.required && <span style={{ color: themed ? "var(--theme-required)" : "#d32f2f", marginLeft: "4px" }}>*</span>}
      </label>
      {desc && <p style={{ fontSize: "13px", color: themed ? "var(--theme-text-secondary)" : "#666", margin: 0 }}>{desc}</p>}

      {q.type === "text" && (
        <input
          style={inputStyle}
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswer(q.id, e.target.value)}
          placeholder="Scrivi qui..."
        />
      )}

      {q.type === "long_text" && (
        <textarea
          style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswer(q.id, e.target.value)}
          placeholder="Scrivi qui..."
        />
      )}

      {q.type === "choice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", border: `1px solid ${error ? "#d32f2f" : themed ? "var(--theme-border)" : "#e0e0e0"}`, borderRadius: themed ? "var(--theme-input-radius)" : "6px", padding: "12px" }}>
          {q.options.map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: themed ? "var(--theme-body-size)" : "14px" }}>
              <input type="radio" name={`q-${q.id}`} checked={answer === opt.value} onChange={() => onAnswer(q.id, opt.value)} />
              {t(opt.label, lang) || opt.value}
            </label>
          ))}
        </div>
      )}

      {q.type === "multi_choice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", border: `1px solid ${error ? "#d32f2f" : themed ? "var(--theme-border)" : "#e0e0e0"}`, borderRadius: themed ? "var(--theme-input-radius)" : "6px", padding: "12px" }}>
          {q.options.map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: themed ? "var(--theme-body-size)" : "14px" }}>
              <input type="checkbox" checked={Array.isArray(answer) && answer.includes(opt.value)} onChange={() => onToggleMulti(q.id, opt.value)} />
              {t(opt.label, lang) || opt.value}
            </label>
          ))}
        </div>
      )}

      {q.type === "rating" && (
        <div style={{ display: "flex", gap: "4px" }}>
          {Array.from({ length: (q.max ?? 5) - (q.min ?? 1) + 1 }, (_, i) => (q.min ?? 1) + i).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => onAnswer(q.id, val)}
              style={{
                width: "40px", height: "40px",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "8px", border: "1px solid",
                borderColor: answer === val ? (themed ? "var(--theme-btn-bg)" : "#1976d2") : (themed ? "var(--theme-border)" : "#e0e0e0"),
                background: answer === val ? (themed ? "var(--theme-btn-bg)" : "#1976d2") : "transparent",
                color: answer === val ? (themed ? "var(--theme-btn-color)" : "#fff") : "inherit",
                cursor: "pointer", fontWeight: 500,
              }}
            >
              {val}
            </button>
          ))}
        </div>
      )}

      {q.type === "date" && (
        <input
          type="date"
          style={inputStyle}
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswer(q.id, e.target.value)}
        />
      )}

      {error && <p style={{ fontSize: "12px", color: themed ? "var(--theme-error)" : "#d32f2f", margin: 0 }}>{error}</p>}
    </div>
  );
}

// ── Submit status bar ────────────────────────────────────────────────

const STEPS: { key: SubmitStep; label: string; icon: typeof Shield }[] = [
  { key: "generating_keys", label: "Generazione chiavi crittografiche...", icon: Shield },
  { key: "encrypting", label: "Crittografia risposte...", icon: Shield },
  { key: "connecting", label: "Connessione al relay Nostr...", icon: Radio },
  { key: "publishing", label: "Invio al relay...", icon: Send },
  { key: "relay_confirmed", label: "Confermato dal relay", icon: Send },
  { key: "receipt_received", label: "Registrato dal server", icon: Server },
];

const STEP_ORDER: SubmitStep[] = STEPS.map((s) => s.key);

function getStepState(
  stepKey: SubmitStep,
  currentStep: SubmitStep,
): "waiting" | "pending" | "ok" | "error" {
  if (currentStep === "error") return "error";
  const currentIdx = STEP_ORDER.indexOf(currentStep);
  const stepIdx = STEP_ORDER.indexOf(stepKey);
  if (stepIdx < currentIdx) return "ok";
  if (stepIdx === currentIdx) return "pending";
  return "waiting";
}

function SubmitStatusBar({ progress, themed }: { progress: SubmitProgress; themed: boolean }) {
  const stepStyles: Record<string, React.CSSProperties> = {
    waiting: { background: themed ? "rgba(0,0,0,0.03)" : "#f3f4f6", color: "#9ca3af" },
    pending: { background: themed ? "rgba(254,243,199,0.8)" : "#fef3c7", color: "#92400e" },
    ok: { background: themed ? "rgba(209,250,229,0.8)" : "#d1fae5", color: "#065f46" },
    error: { background: themed ? "rgba(254,226,226,0.8)" : "#fee2e2", color: "#991b1b" },
  };

  return (
    <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
      {STEPS.map((step) => {
        const state = getStepState(step.key, progress.step);
        const Icon = step.icon;
        const isActive = state === "pending";
        let label = step.label;

        if (step.key === "relay_confirmed" && state === "ok") {
          label = `Confermato dal relay (${progress.relayOkCount}/${progress.totalEvents} eventi)`;
        }
        if (step.key === "receipt_received" && state === "ok" && progress.receiptTimestamp) {
          label = `Registrato dal server (${progress.receiptTimestamp})`;
        }

        return (
          <div
            key={step.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              transition: "all 0.3s",
              ...stepStyles[state],
            }}
          >
            {state === "ok" ? (
              <CheckCircle2 style={{ width: 18, height: 18, flexShrink: 0 }} />
            ) : state === "error" ? (
              <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
            ) : isActive ? (
              <Loader2 style={{ width: 18, height: 18, flexShrink: 0, animation: "spin 1s linear infinite" }} />
            ) : (
              <Icon style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.5 }} />
            )}
            <span>{label}</span>
          </div>
        );
      })}

      {progress.ephPubKey && (
        <div style={{ fontSize: "0.72rem", color: "#999", marginTop: "4px" }}>
          Chiave effimera: <code>{progress.ephPubKey.slice(0, 20)}...</code> (distrutta alla chiusura)
        </div>
      )}

      {progress.step === "error" && progress.errorMessage && (
        <div style={{ fontSize: "0.85rem", color: "#991b1b", marginTop: "4px" }}>
          {progress.errorMessage}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
