export interface BuiltinDecoration {
  id: string;
  label: string;
  src: string;
}

export const BUILTIN_DECORATIONS: BuiltinDecoration[] = [
  { id: "survey", label: "Sondaggio", src: "/decorations/survey.svg" },
  { id: "teamwork", label: "Lavoro di squadra", src: "/decorations/teamwork.svg" },
  { id: "feedback", label: "Feedback", src: "/decorations/feedback.svg" },
  { id: "security", label: "Sicurezza", src: "/decorations/security.svg" },
  { id: "diversity", label: "Diversita", src: "/decorations/diversity.svg" },
  { id: "parita", label: "Parita di genere", src: "/decorations/parita.jpg" },
  { id: "worklife", label: "Work-life balance", src: "/decorations/worklifebalance.png" },
  { id: "parita2", label: "Parita di genere 2", src: "/decorations/parita2.jpg" },
];

export function getDecorationSrc(
  type: "none" | "builtin" | "url",
  builtinId: string | null,
  url: string | null,
): string | null {
  if (type === "builtin" && builtinId) {
    const found = BUILTIN_DECORATIONS.find((d) => d.id === builtinId);
    return found?.src ?? null;
  }
  if (type === "url" && url) {
    return url;
  }
  return null;
}

export const DECORATION_SIZE_MAP: Record<string, string> = {
  small: "25%",
  medium: "33%",
  large: "40%",
};
