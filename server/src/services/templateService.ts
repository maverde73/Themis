import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";

const TEMPLATES_DIR = join(__dirname, "..", "templates");

interface TemplateConfig {
  file: string;
  kind: "REPORT";
  channel: string;
  icon: string;
}

const TEMPLATE_MAP: Record<string, TemplateConfig> = {
  pdr125: {
    file: "pdr125_template.json",
    kind: "REPORT",
    channel: "PDR125",
    icon: "shield",
  },
  wb: {
    file: "wb_template.json",
    kind: "REPORT",
    channel: "WHISTLEBLOWING",
    icon: "gavel",
  },
};

function loadTemplate(templateId: string): { schema: unknown; config: TemplateConfig } {
  const config = TEMPLATE_MAP[templateId];
  if (!config) {
    throw new AppError(400, `Unknown template: ${templateId}`);
  }

  const filePath = join(TEMPLATES_DIR, config.file);
  const raw = readFileSync(filePath, "utf-8");
  return { schema: JSON.parse(raw), config };
}

function resolveTitle(schema: Record<string, unknown>): string {
  const title = schema.title;
  if (typeof title === "string") return title;
  if (typeof title === "object" && title !== null) {
    const map = title as Record<string, string>;
    return map.en ?? map.it ?? Object.values(map)[0] ?? "Imported form";
  }
  return "Imported form";
}

export async function importTemplates(orgId: string, templateIds: string[]) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError(404, "Organization not found");

  const results = [];

  for (const templateId of templateIds) {
    const { schema, config } = loadTemplate(templateId);
    const title = resolveTitle(schema as Record<string, unknown>);

    const survey = await prisma.survey.create({
      data: {
        orgId,
        title,
        schema: schema as object,
        version: 1,
        status: "DRAFT",
        kind: config.kind,
        channel: config.channel,
        icon: config.icon,
      },
    });

    results.push(survey);
  }

  return results;
}
