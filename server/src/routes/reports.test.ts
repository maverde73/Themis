import crypto from "crypto";
import request from "supertest";
import app from "../app";
import { prisma } from "../utils/prisma";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000097";
const PAIRING_SECRET = crypto.randomBytes(32).toString("hex");
let token: string;
let anonToken: string;
let reportId: string;

function generateAnonProof(orgId: string, secret: string, timestamp: number, nonce: string): string {
  const message = `${orgId}|${timestamp}|${nonce}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

beforeAll(async () => {
  await prisma.organization.upsert({
    where: { id: TEST_ORG_ID },
    update: { pairingSecret: PAIRING_SECRET },
    create: {
      id: TEST_ORG_ID,
      name: "Report Test Org",
      plan: "STARTER",
      relayUrls: ["ws://localhost:7777"],
      pairingSecret: PAIRING_SECRET,
    },
  });

  const res = await request(app).post("/api/v1/auth/register").send({
    email: "report-test@example.com",
    password: "password123",
    role: "RPG",
    orgId: TEST_ORG_ID,
  });
  token = res.body.token;

  // Get anonymous token
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const proof = generateAnonProof(TEST_ORG_ID, PAIRING_SECRET, timestamp, nonce);
  const anonRes = await request(app).post("/api/v1/auth/anonymous").send({
    orgId: TEST_ORG_ID,
    timestamp,
    nonce,
    proof,
  });
  anonToken = anonRes.body.token;
});

afterAll(async () => {
  await prisma.reportMetadata.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.user.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } });
  await prisma.$disconnect();
});

describe("POST /api/v1/reports/metadata", () => {
  it("creates report with anonymous token", async () => {
    const res = await request(app)
      .post("/api/v1/reports/metadata")
      .set("Authorization", `Bearer ${anonToken}`)
      .send({
        orgId: TEST_ORG_ID,
        channel: "PDR125",
        receivedAt: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
    expect(res.body.orgId).toBe(TEST_ORG_ID);
    expect(res.body.channel).toBe("PDR125");
    expect(res.body.category).toBeNull();
    expect(res.body.identityRevealed).toBeNull();
    expect(res.body.hasAttachments).toBeNull();
    reportId = res.body.id;
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app).post("/api/v1/reports/metadata").send({
      orgId: TEST_ORG_ID,
      channel: "PDR125",
    });
    expect(res.status).toBe(401);
  });

  it("creates report without receivedAt (defaults to now)", async () => {
    const res = await request(app)
      .post("/api/v1/reports/metadata")
      .set("Authorization", `Bearer ${anonToken}`)
      .send({
        orgId: TEST_ORG_ID,
        channel: "WHISTLEBLOWING",
      });
    expect(res.status).toBe(201);
    expect(res.body.receivedAt).toBeDefined();
  });

  it("rejects extra field: category", async () => {
    const res = await request(app)
      .post("/api/v1/reports/metadata")
      .set("Authorization", `Bearer ${anonToken}`)
      .send({
        orgId: TEST_ORG_ID,
        channel: "PDR125",
        category: "molestia",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
  });

  it("rejects extra field: identityRevealed", async () => {
    const res = await request(app)
      .post("/api/v1/reports/metadata")
      .set("Authorization", `Bearer ${anonToken}`)
      .send({
        orgId: TEST_ORG_ID,
        channel: "PDR125",
        identityRevealed: true,
      });
    expect(res.status).toBe(400);
  });

  it("rejects extra field: hasAttachments", async () => {
    const res = await request(app)
      .post("/api/v1/reports/metadata")
      .set("Authorization", `Bearer ${anonToken}`)
      .send({
        orgId: TEST_ORG_ID,
        channel: "PDR125",
        hasAttachments: true,
      });
    expect(res.status).toBe(400);
  });

  it("rejects invalid channel", async () => {
    const res = await request(app)
      .post("/api/v1/reports/metadata")
      .set("Authorization", `Bearer ${anonToken}`)
      .send({
        orgId: TEST_ORG_ID,
        channel: "INVALID",
      });
    expect(res.status).toBe(400);
  });

  it("rejects non-existent orgId", async () => {
    const res = await request(app)
      .post("/api/v1/reports/metadata")
      .set("Authorization", `Bearer ${anonToken}`)
      .send({
        orgId: "00000000-0000-0000-0000-000000000000",
        channel: "PDR125",
      });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/reports/metadata/:id (enrichment)", () => {
  it("enriches report with category", async () => {
    const res = await request(app)
      .put(`/api/v1/reports/metadata/${reportId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ category: "molestia_sessuale" });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe("molestia_sessuale");
  });

  it("enriches report with identity and attachments flags", async () => {
    const res = await request(app)
      .put(`/api/v1/reports/metadata/${reportId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ identityRevealed: false, hasAttachments: true });
    expect(res.status).toBe(200);
    expect(res.body.identityRevealed).toBe(false);
    expect(res.body.hasAttachments).toBe(true);
  });

  it("enriches report with status transition", async () => {
    const res = await request(app)
      .put(`/api/v1/reports/metadata/${reportId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ACKNOWLEDGED" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ACKNOWLEDGED");
    expect(res.body.acknowledgedAt).toBeDefined();
  });

  it("rejects invalid status transition", async () => {
    const res = await request(app)
      .put(`/api/v1/reports/metadata/${reportId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "CLOSED_FOUNDED" });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated enrichment", async () => {
    const res = await request(app)
      .put(`/api/v1/reports/metadata/${reportId}`)
      .send({ category: "test" });
    expect(res.status).toBe(401);
  });

  it("rejects empty update", async () => {
    const res = await request(app)
      .put(`/api/v1/reports/metadata/${reportId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/reports/metadata", () => {
  it("requires auth", async () => {
    const res = await request(app).get(`/api/v1/reports/metadata?org_id=${TEST_ORG_ID}`);
    expect(res.status).toBe(401);
  });

  it("lists reports for org (paginated)", async () => {
    const res = await request(app)
      .get(`/api/v1/reports/metadata?org_id=${TEST_ORG_ID}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("filters by channel", async () => {
    const res = await request(app)
      .get(`/api/v1/reports/metadata?org_id=${TEST_ORG_ID}&channel=PDR125`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.channel).toBe("PDR125");
    }
  });

  it("filters by status", async () => {
    const res = await request(app)
      .get(`/api/v1/reports/metadata?org_id=${TEST_ORG_ID}&status=ACKNOWLEDGED`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.status).toBe("ACKNOWLEDGED");
    }
  });

  it("paginates with page and limit", async () => {
    const res = await request(app)
      .get(`/api/v1/reports/metadata?org_id=${TEST_ORG_ID}&page=1&limit=1`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(1);
  });
});

describe("GET /api/v1/reports/metadata/:id", () => {
  it("returns report with SLA computed fields", async () => {
    const res = await request(app)
      .get(`/api/v1/reports/metadata/${reportId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(reportId);
    expect(res.body).toHaveProperty("slaAckDaysRemaining");
    expect(res.body).toHaveProperty("slaAckOverdue");
    expect(res.body).toHaveProperty("slaResponseDaysRemaining");
    expect(res.body).toHaveProperty("slaResponseOverdue");
    expect(res.body).toHaveProperty("validNextStatuses");
    expect(Array.isArray(res.body.validNextStatuses)).toBe(true);
  });
});
