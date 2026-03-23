import request from "supertest";
import app from "../app";
import { prisma } from "../utils/prisma";

let token: string;
let orgId: string;

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000098";

beforeAll(async () => {
  // Create a test org and user for auth
  await prisma.organization.upsert({
    where: { id: TEST_ORG_ID },
    update: {},
    create: {
      id: TEST_ORG_ID,
      name: "Org Test Bootstrap",
      plan: "STARTER",
      relayUrls: ["ws://localhost:7777"],
    },
  });

  const res = await request(app).post("/api/v1/auth/register").send({
    email: "org-test@example.com",
    password: "password123",
    role: "ADMIN",
    orgId: TEST_ORG_ID,
  });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { orgId: { in: [TEST_ORG_ID, orgId].filter(Boolean) } } });
  if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } }).catch(() => {});
  await prisma.$disconnect();
});

describe("POST /api/v1/organizations", () => {
  it("creates an organization", async () => {
    const res = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Test Corp" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("New Test Corp");
    expect(res.body.plan).toBe("STARTER");
    orgId = res.body.id;
  });

  it("allows unauthenticated org creation (public onboarding)", async () => {
    const res = await request(app)
      .post("/api/v1/organizations")
      .send({ name: "Fail Corp" });
    expect(res.status).toBe(201);
    // Cleanup
    await prisma.organization.delete({ where: { id: res.body.id } }).catch(() => {});
  });
});

describe("GET /api/v1/organizations/:id", () => {
  it("returns organization by id", async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Test Corp");
  });

  it("returns 404 for non-existent org", async () => {
    const res = await request(app)
      .get("/api/v1/organizations/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/organizations/:id/keys", () => {
  it("uploads public keys", async () => {
    const res = await request(app)
      .put(`/api/v1/organizations/${orgId}/keys`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        rpgPublicKey: "rpg-ed25519-pubkey-base64",
        odvPublicKey: "odv-ed25519-pubkey-base64",
      });
    expect(res.status).toBe(200);
    expect(res.body.rpgPublicKey).toBe("rpg-ed25519-pubkey-base64");
    expect(res.body.odvPublicKey).toBe("odv-ed25519-pubkey-base64");
  });
});

describe("POST /api/v1/organizations/:id/pairing-qr", () => {
  it("generates pairing QR data with dual keys", async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgId}/pairing-qr`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.orgId).toBe(orgId);
    expect(res.body.rpgPublicKey).toBe("rpg-ed25519-pubkey-base64");
    expect(res.body.odvPublicKey).toBe("odv-ed25519-pubkey-base64");
    expect(res.body.relayUrls).toBeDefined();
  });

  it("fails without keys uploaded", async () => {
    // Create org without keys
    const createRes = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "No Keys Corp" });
    const noKeysOrgId = createRes.body.id;

    const res = await request(app)
      .post(`/api/v1/organizations/${noKeysOrgId}/pairing-qr`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);

    // Cleanup
    await prisma.organization.delete({ where: { id: noKeysOrgId } });
  });
});
