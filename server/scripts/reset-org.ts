import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../src/utils/config";

const ORG_ID = "7d4513c4-723f-4f0a-afd0-5d8c9dbed384";

const adapter = new PrismaPg({ connectionString: config.databaseUrl });
const prisma = new PrismaClient({ adapter });

async function resetOrg() {
  const org = await prisma.organization.findUnique({ where: { id: ORG_ID } });
  if (!org) {
    console.error(`Organization ${ORG_ID} not found`);
    process.exit(1);
  }
  console.log(`Resetting org: ${org.name} (${org.id})`);

  // Delete in FK-safe order
  const surveyResponses = await prisma.surveyResponse.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${surveyResponses.count} survey responses`);

  const escrowShares = await prisma.escrowShare.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${escrowShares.count} escrow shares`);

  const reports = await prisma.reportMetadata.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${reports.count} report metadata`);

  // Unlink surveys from themes before deleting themes
  const surveys = await prisma.survey.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${surveys.count} surveys`);

  const themes = await prisma.surveyTheme.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${themes.count} survey themes`);

  const invites = await prisma.invite.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${invites.count} invites`);

  const dashboards = await prisma.dashboard.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${dashboards.count} dashboards`);

  // Users must come after invites (createdById FK)
  const users = await prisma.user.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${users.count} users`);

  const orgRoles = await prisma.orgRole.deleteMany({ where: { orgId: ORG_ID } });
  console.log(`  Deleted ${orgRoles.count} org roles`);

  // Nostr events have no orgId — wipe all (they reference now-invalid keys)
  const nostrEvents = await prisma.nostrEvent.deleteMany({});
  console.log(`  Deleted ${nostrEvents.count} nostr events`);

  // Reset org crypto state
  await prisma.organization.update({
    where: { id: ORG_ID },
    data: {
      rpgPublicKey: null,
      odvPublicKey: null,
      levelPubKeys: null,
      pairingQrData: null,
    },
  });
  console.log(`  Reset org crypto keys`);

  // Create RPG invite
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.invite.create({
    data: {
      orgId: ORG_ID,
      role: "RPG",
      expiresAt,
    },
  });

  console.log(`\nDone! RPG invite created.`);
  console.log(`Register at: http://localhost:3000/register/${invite.token}`);
}

resetOrg()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
