import { prisma } from "./utils/prisma";

async function seed() {
  console.log("Seeding database...");

  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Test Company S.r.l.",
      plan: "STARTER",
      relayUrls: ["ws://localhost:7777"],
      pdrSlaAckDays: 3,
      pdrSlaResponseDays: 45,
      wbSlaAckDays: 7,
      wbSlaResponseDays: 90,
    },
  });

  console.log(`Organization created: ${org.name} (${org.id})`);

  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash("test1234", 10);

  const rpgUser = await prisma.user.upsert({
    where: { email: "rpg@test.com" },
    update: {},
    create: {
      email: "rpg@test.com",
      password: hashedPassword,
      role: "RPG",
      orgId: org.id,
    },
  });

  const odvUser = await prisma.user.upsert({
    where: { email: "odv@test.com" },
    update: {},
    create: {
      email: "odv@test.com",
      password: hashedPassword,
      role: "ODV",
      orgId: org.id,
    },
  });

  console.log(`RPG user: ${rpgUser.email}`);
  console.log(`OdV user: ${odvUser.email}`);
  console.log("Seed complete.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
