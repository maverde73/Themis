import { readdirSync, readFileSync } from "fs";
import { join, basename } from "path";
import { prisma } from "../utils/prisma";
import { AppError } from "../middleware/errorHandler";

const TEMPLATES_DIR = join(__dirname, "..", "templates");

interface TemplateMeta {
  channel?: string;
  icon: string;
  catalogTitle: Record<string, string>;
  catalogDescription: Record<string, string>;
}

export interface TemplateCatalogEntry {
  id: string;
  slug: string;
  channel?: string | null;
  icon: string | null;
  catalogTitle: Record<string, string>;
  catalogDescription: Record<string, string>;
}

export async function listTemplates(): Promise<TemplateCatalogEntry[]> {
  const templates = await prisma.formTemplate.findMany({
    orderBy: { createdAt: "asc" },
  });
  return templates.map((t) => ({
    id: t.slug,
    slug: t.slug,
    channel: t.channel,
    icon: t.icon,
    catalogTitle: t.catalogTitle as Record<string, string>,
    catalogDescription: t.catalogDescription as Record<string, string>,
  }));
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

  for (const slug of templateIds) {
    const template = await prisma.formTemplate.findUnique({ where: { slug } });
    if (!template) throw new AppError(400, `Unknown template: ${slug}`);

    const schema = template.schema as Record<string, unknown>;
    const title = resolveTitle(schema);

    const survey = await prisma.survey.create({
      data: {
        orgId,
        title,
        schema: schema as object,
        version: 1,
        status: "DRAFT",
        channel: template.channel,
        icon: template.icon,
      },
    });

    results.push(survey);
  }

  return results;
}

export async function seedTemplates(): Promise<void> {
  let files: string[];
  try {
    files = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith("_template.json"));
  } catch {
    console.warn("Templates directory not found, skipping seed");
    return;
  }

  for (const file of files) {
    const slug = basename(file, "_template.json");
    const raw = readFileSync(join(TEMPLATES_DIR, file), "utf-8");
    const parsed = JSON.parse(raw);
    const meta = parsed._meta as TemplateMeta | undefined;
    if (!meta) continue;

    const { _meta, ...schema } = parsed;
    const title = resolveTitle(schema as Record<string, unknown>);

    await prisma.formTemplate.upsert({
      where: { slug },
      update: {
        title,
        description: typeof schema.description === "string" ? schema.description : null,
        schema: schema as object,
        channel: meta.channel ?? null,
        icon: meta.icon,
        catalogTitle: meta.catalogTitle as object,
        catalogDescription: meta.catalogDescription as object,
      },
      create: {
        slug,
        title,
        description: typeof schema.description === "string" ? schema.description : null,
        schema: schema as object,
        channel: meta.channel ?? null,
        icon: meta.icon,
        catalogTitle: meta.catalogTitle as object,
        catalogDescription: meta.catalogDescription as object,
      },
    });
  }

  console.log(`Seeded ${files.length} form templates`);
}
