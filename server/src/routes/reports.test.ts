import request from "supertest";
import app from "../app";
import { prisma } from "../utils/prisma";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000097";
let token: string;
let reportId: string;

beforeAll(async () => {
  await prisma.organization.upsert({
    where: { id: TEST_ORG_ID },
    update: {},
    create: {
      id: TEST_ORG_ID,
      name: "Report Test Org",
      plan: "STARTER",
      relayUrls: ["ws://localhost:7777"],
    },
  });

  const res = await request(app).post("/api/v1/auth/register").send({
    email: "report-test@example.com",
    password: "password123",
    role: "RPG",
    orgId: TEST_ORG_ID,
  });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.reportMetadata.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.user.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } });
  await prisma.$disconnect();
});

describe("POST /api/v1/reports/metadata", () => {
  it("creates report with only orgId, channel, receivedAt", async () => {
    const res = await request(app).post("/api/v1/reports/metadata").send({
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

  it("creates report without receivedAt (defaults to now)", async () => {
    const res = await request(app).post("/api/v1/reports/metadata").send({
      orgId: TEST_ORG_ID,
      channel: "WHISTLEBLOWING",
    });
    expect(res.status).toBe(201);
    expect(res.body.receivedAt).toBeDefined();
  });

  it("rejects extra field: category", async () => {
    const res = await request(app).post("/api/v1/reports/metadata").send({
      orgId: TEST_ORG_ID,
      channel: "PDR125",
      category: "molestia",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
  });

  it("rejects extra field: identityRevealed", async () => {
    const res = await request(app).post("/api/v1/reports/metadata").send({
      orgId: TEST_ORG_ID,
      channel: "PDR125",
      identityRevealed: true,
    });
    expect(res.status).toBe(400);
  });

  it("rejects extra field: hasAttachments", async () => {
    const res = await request(app).post("/api/v1/reports/metadata").send({
      orgId: TEST_ORG_ID,
      channel: "PDR125",
      hasAttachments: true,
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid channel", async () => {
    const res = await request(app).post("/api/v1/reports/metadata").send({
      orgId: TEST_ORG_ID,
      channel: "INVALID",
    });
    expect(res.status).toBe(400);
  });

  it("rejects non-existent orgId", async () => {
    const res = await request(app).post("/api/v1/reports/metadata").send({
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

  it("lists reports for org", async () => {
    const res = await request(app)
      .get(`/api/v1/reports/metadata?org_id=${TEST_ORG_ID}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});
