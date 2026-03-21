import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BUILTIN_THEMES = [
  {
    name: "Themis Default",
    description: "La palette predefinita Themis — indaco e bianco",
    config: {
      colors: {
        pageBackground: "#f0f2f5",
        surface: "#ffffff",
        primary: "#1976d2",
        primaryHover: "#1565c0",
        text: "#212121",
        textSecondary: "#757575",
        border: "#e0e0e0",
        error: "#d32f2f",
        success: "#388e3c",
        warning: "#f57c00",
        inputBackground: "#ffffff",
        inputBorder: "#bdbdbd",
        inputFocus: "#1976d2",
        selectionHighlight: "rgba(25,118,210,0.08)",
        required: "#d32f2f",
      },
      typography: {
        fontFamily: "Inter, -apple-system, sans-serif",
        fontFamilyHeading: null,
        titleSize: "28px",
        titleWeight: "700",
        subtitleSize: "16px",
        subtitleWeight: "400",
        sectionTitleSize: "18px",
        sectionTitleWeight: "600",
        labelSize: "14px",
        labelWeight: "600",
        bodySize: "14px",
        bodyWeight: "400",
        lineHeight: "1.5",
      },
      spacing: {
        formMaxWidth: "720px",
        formPadding: "32px",
        formPaddingMobile: "16px",
        sectionGap: "28px",
        fieldGap: "20px",
        borderRadius: "8px",
        inputPadding: "12px",
        inputBorderRadius: "6px",
        inputBorderWidth: "1px",
      },
      buttons: {
        backgroundColor: "#1976d2",
        textColor: "#ffffff",
        hoverBackgroundColor: "#1565c0",
        borderRadius: "6px",
        padding: "10px 24px",
        fontSize: "14px",
        fontWeight: "600",
        textTransform: "none",
      },
      card: {
        backgroundColor: "#ffffff",
        borderColor: "#e0e0e0",
        borderWidth: "1px",
        borderRadius: "12px",
        shadow: "0 2px 8px rgba(0,0,0,0.08)",
        padding: "32px",
      },
    },
  },
  {
    name: "Corporate Blue",
    description: "Toni blu professionali per contesti aziendali",
    config: {
      colors: {
        pageBackground: "#eef2f7",
        surface: "#ffffff",
        primary: "#0d47a1",
        primaryHover: "#0a3d8f",
        text: "#1a1a2e",
        textSecondary: "#546e7a",
        border: "#cfd8dc",
        error: "#c62828",
        success: "#2e7d32",
        warning: "#ef6c00",
        inputBackground: "#fafbfc",
        inputBorder: "#b0bec5",
        inputFocus: "#0d47a1",
        selectionHighlight: "rgba(13,71,161,0.08)",
        required: "#c62828",
      },
      typography: {
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontFamilyHeading: "'Segoe UI', system-ui, sans-serif",
        titleSize: "26px",
        titleWeight: "700",
        subtitleSize: "15px",
        subtitleWeight: "400",
        sectionTitleSize: "17px",
        sectionTitleWeight: "600",
        labelSize: "13px",
        labelWeight: "600",
        bodySize: "14px",
        bodyWeight: "400",
        lineHeight: "1.5",
      },
      spacing: {
        formMaxWidth: "700px",
        formPadding: "36px",
        formPaddingMobile: "16px",
        sectionGap: "24px",
        fieldGap: "18px",
        borderRadius: "6px",
        inputPadding: "12px",
        inputBorderRadius: "4px",
        inputBorderWidth: "1px",
      },
      buttons: {
        backgroundColor: "#0d47a1",
        textColor: "#ffffff",
        hoverBackgroundColor: "#0a3d8f",
        borderRadius: "4px",
        padding: "10px 28px",
        fontSize: "14px",
        fontWeight: "600",
        textTransform: "uppercase",
      },
      card: {
        backgroundColor: "#ffffff",
        borderColor: "#cfd8dc",
        borderWidth: "1px",
        borderRadius: "8px",
        shadow: "0 1px 4px rgba(0,0,0,0.06)",
        padding: "36px",
      },
    },
  },
  {
    name: "Warm Earth",
    description: "Toni terra caldi — marrone, crema, oliva",
    config: {
      colors: {
        pageBackground: "#f5f0e8",
        surface: "#fffdf7",
        primary: "#8d6e4c",
        primaryHover: "#7a5e3f",
        text: "#3e2c1c",
        textSecondary: "#7c6955",
        border: "#d4c5b0",
        error: "#bf360c",
        success: "#558b2f",
        warning: "#e65100",
        inputBackground: "#fffdf7",
        inputBorder: "#c4b59b",
        inputFocus: "#8d6e4c",
        selectionHighlight: "rgba(141,110,76,0.10)",
        required: "#bf360c",
      },
      typography: {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontFamilyHeading: "Georgia, serif",
        titleSize: "28px",
        titleWeight: "700",
        subtitleSize: "16px",
        subtitleWeight: "400",
        sectionTitleSize: "18px",
        sectionTitleWeight: "600",
        labelSize: "14px",
        labelWeight: "600",
        bodySize: "14px",
        bodyWeight: "400",
        lineHeight: "1.6",
      },
      spacing: {
        formMaxWidth: "680px",
        formPadding: "32px",
        formPaddingMobile: "16px",
        sectionGap: "28px",
        fieldGap: "20px",
        borderRadius: "10px",
        inputPadding: "12px",
        inputBorderRadius: "8px",
        inputBorderWidth: "1px",
      },
      buttons: {
        backgroundColor: "#8d6e4c",
        textColor: "#fffdf7",
        hoverBackgroundColor: "#7a5e3f",
        borderRadius: "8px",
        padding: "10px 24px",
        fontSize: "14px",
        fontWeight: "600",
        textTransform: "none",
      },
      card: {
        backgroundColor: "#fffdf7",
        borderColor: "#d4c5b0",
        borderWidth: "1px",
        borderRadius: "14px",
        shadow: "0 2px 12px rgba(62,44,28,0.06)",
        padding: "32px",
      },
    },
  },
  {
    name: "Minimal Dark",
    description: "Sfondo scuro con testo chiaro — elegante e moderno",
    config: {
      colors: {
        pageBackground: "#1a1a1a",
        surface: "#2d2d2d",
        primary: "#6c9fff",
        primaryHover: "#5a8de6",
        text: "#e8e8e8",
        textSecondary: "#a0a0a0",
        border: "#404040",
        error: "#ff6b6b",
        success: "#69db7c",
        warning: "#ffd43b",
        inputBackground: "#363636",
        inputBorder: "#505050",
        inputFocus: "#6c9fff",
        selectionHighlight: "rgba(108,159,255,0.12)",
        required: "#ff6b6b",
      },
      typography: {
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontFamilyHeading: null,
        titleSize: "26px",
        titleWeight: "600",
        subtitleSize: "15px",
        subtitleWeight: "400",
        sectionTitleSize: "17px",
        sectionTitleWeight: "600",
        labelSize: "13px",
        labelWeight: "500",
        bodySize: "14px",
        bodyWeight: "400",
        lineHeight: "1.5",
      },
      spacing: {
        formMaxWidth: "720px",
        formPadding: "32px",
        formPaddingMobile: "16px",
        sectionGap: "24px",
        fieldGap: "18px",
        borderRadius: "10px",
        inputPadding: "12px",
        inputBorderRadius: "8px",
        inputBorderWidth: "1px",
      },
      buttons: {
        backgroundColor: "#6c9fff",
        textColor: "#1a1a1a",
        hoverBackgroundColor: "#5a8de6",
        borderRadius: "8px",
        padding: "10px 24px",
        fontSize: "14px",
        fontWeight: "600",
        textTransform: "none",
      },
      card: {
        backgroundColor: "#2d2d2d",
        borderColor: "#404040",
        borderWidth: "1px",
        borderRadius: "12px",
        shadow: "0 4px 16px rgba(0,0,0,0.3)",
        padding: "32px",
      },
    },
  },
];

async function main() {
  console.log("Seeding builtin themes...");

  for (const theme of BUILTIN_THEMES) {
    const existing = await prisma.surveyTheme.findFirst({
      where: { name: theme.name, isBuiltin: true },
    });
    if (existing) {
      await prisma.surveyTheme.update({
        where: { id: existing.id },
        data: { config: theme.config, description: theme.description },
      });
    } else {
      await prisma.surveyTheme.create({
        data: {
          name: theme.name,
          description: theme.description,
          config: theme.config,
          isBuiltin: true,
          isPublic: true,
        },
      });
    }
  }

  // Count instead of checking individual results
  const count = await prisma.surveyTheme.count({ where: { isBuiltin: true } });
  console.log(`Done. ${count} builtin themes in database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
