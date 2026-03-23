import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../src/utils/config";

const adapter = new PrismaPg({ connectionString: config.databaseUrl });
const prisma = new PrismaClient({ adapter });

const ALL_BUILTIN_ROLES = [
  { name: "Responsabile Parità", slug: "responsabile", dataLevel: 0, isBuiltin: true, description: "Accesso completo ai dati identificativi e ai fatti. Gestisce team e sondaggi." },
  { name: "Investigatori Designati", slug: "investigatori", dataLevel: 1, isBuiltin: true, description: "Accesso ai fatti completi e persone coinvolte. Nessun dato di contatto." },
  { name: "Comitato Guida", slug: "comitato-guida", dataLevel: 2, isBuiltin: true, description: "Fatti anonimizzati: descrizione, date, luoghi. Nessuna identità o contatto." },
  { name: "Management / Auditor", slug: "management", dataLevel: 4, isBuiltin: true, description: "Solo dati statistici aggregati: categorie, luoghi, presenza testimoni." },
];

// accessLevel mapping for PdR 125 form fields
const ACCESS_LEVEL_MAP: Record<string, number> = {
  category: 4,
  category_other: 2,
  description: 2,
  when: 2,
  where: 4,
  where_other: 2,
  people_involved: 1,
  witnesses: 4,
  previous_report: 4,
  wants_contact: 5,
  contact_info: 0,
};

async function seedRoles() {
  // Seed all builtin roles to every org (adds missing ones, skips existing)
  const orgs = await prisma.organization.findMany({
    include: { orgRoles: { where: { isBuiltin: true } } },
  });

  let rolesCreated = 0;
  for (const org of orgs) {
    const existingSlugs = new Set(org.orgRoles.map((r) => r.slug));
    const missing = ALL_BUILTIN_ROLES.filter((r) => !existingSlugs.has(r.slug));

    if (missing.length === 0) {
      console.log(`  ${org.name} (${org.id}): all roles present, skipping`);
      continue;
    }

    await prisma.orgRole.createMany({
      data: missing.map((r) => ({ ...r, orgId: org.id })),
    });
    rolesCreated += missing.length;
    console.log(`  ${org.name} (${org.id}): added ${missing.length} roles (${missing.map((r) => r.slug).join(", ")})`);
  }
  console.log(`\nRoles: created ${rolesCreated} across ${orgs.length} orgs`);
}

async function migrateSurveySchemas() {
  // Find active PDR125 surveys with legacy private fields
  const surveys = await prisma.survey.findMany({
    where: { channel: "PDR125", status: "ACTIVE" },
  });

  let updated = 0;
  for (const survey of surveys) {
    const schema = survey.schema as { questions?: Array<Record<string, unknown>> };
    if (!schema.questions) continue;

    let changed = false;
    for (const q of schema.questions) {
      const id = q.id as string;

      // If field has a known accessLevel mapping, apply it
      if (id in ACCESS_LEVEL_MAP) {
        const targetLevel = ACCESS_LEVEL_MAP[id];
        const currentLevel = q.accessLevel as number | undefined;
        const hasPrivate = "private" in q;

        if (currentLevel !== targetLevel || hasPrivate) {
          q.accessLevel = targetLevel;
          if (hasPrivate) delete q.private;
          changed = true;
        }
      }
    }

    if (changed) {
      await prisma.survey.update({
        where: { id: survey.id },
        data: { schema: schema as object },
      });
      updated++;
      console.log(`  Survey ${survey.id} (org ${survey.orgId}): schema updated`);
    } else {
      console.log(`  Survey ${survey.id} (org ${survey.orgId}): already up to date`);
    }
  }
  console.log(`\nSurveys: updated ${updated} of ${surveys.length}`);
}

async function main() {
  console.log("=== Seed PdR 125 roles & accessLevel migration ===\n");

  console.log("--- Step 1: Add missing builtin roles ---");
  await seedRoles();

  console.log("\n--- Step 2: Migrate survey schemas ---");
  await migrateSurveySchemas();

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
