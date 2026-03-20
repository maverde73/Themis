import request from "supertest";
import app from "../app";
import { prisma } from "../utils/prisma";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000096";
let token: string;
let surveyId: string;

const SURVEY_SCHEMA = {
  title: "Gender Equality Climate Survey",
  description: "Annual climate assessment",
  questions: [
    {
      id: "q1",
      type: "choice",
      label: "How would you rate workplace inclusivity?",
      options: ["Excellent", "Good", "Fair", "Poor"],
    },
    {
      id: "q2",
      type: "rating",
      label: "Rate your sense of belonging (1-10)",
      min: 1,
      max: 10,
    },
    {
      id: "q3",
      type: "nps",
      label: "How likely are you to recommend this workplace?",
      min: 0,
      max: 10,
    },
    {
      id: "q4",
      type: "text",
      label: "Describe your experience (private)",
      private: true,
    },
    {
      id: "q5",
      type: "multi_choice",
      label: "Which areas need improvement?",
      options: ["Pay equity", "Promotion fairness", "Parental leave", "Flexibility"],
    },
    {
      id: "q6",
      type: "ranking",
      label: "Rank priorities",
      options: ["Safety", "Inclusion", "Growth", "Balance"],
    },
    {
      id: "q7",
      type: "likert",
      label: "Rate the following statements",
      statements: ["Management is fair", "Pay is equitable"],
    },
  ],
};

beforeAll(async () => {
  await prisma.organization.upsert({
    where: { id: TEST_ORG_ID },
    update: {},
    create: {
      id: TEST_ORG_ID,
      name: "Survey Test Org",
      plan: "STARTER",
      relayUrls: ["ws://localhost:7777"],
    },
  });

  const res = await request(app).post("/api/v1/auth/register").send({
    email: "survey-test@example.com",
    password: "password123",
    role: "RPG",
    orgId: TEST_ORG_ID,
  });
  token = res.body.token;
});

afterAll(async () => {
  await prisma.surveyResponse.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.survey.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.user.deleteMany({ where: { orgId: TEST_ORG_ID } });
  await prisma.organization.delete({ where: { id: TEST_ORG_ID } });
  await prisma.$disconnect();
});

// ── CRUD ─────────────────────────────────────────────────────────────────

describe("POST /api/v1/surveys", () => {
  it("creates a survey", async () => {
    const res = await request(app)
      .post("/api/v1/surveys")
      .set("Authorization", `Bearer ${token}`)
      .send({
        orgId: TEST_ORG_ID,
        title: SURVEY_SCHEMA.title,
        description: SURVEY_SCHEMA.description,
        schema: SURVEY_SCHEMA,
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(SURVEY_SCHEMA.title);
    expect(res.body.status).toBe("DRAFT");
    expect(res.body.version).toBe(1);
    surveyId = res.body.id;
  });

  it("rejects unauthenticated creation", async () => {
    const res = await request(app)
      .post("/api/v1/surveys")
      .send({ orgId: TEST_ORG_ID, title: "Test", schema: SURVEY_SCHEMA });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/surveys", () => {
  it("lists surveys for org", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys?org_id=${TEST_ORG_ID}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("filters by status", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys?org_id=${TEST_ORG_ID}&status=ACTIVE`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

describe("GET /api/v1/surveys/:id", () => {
  it("returns survey without auth (for mobile app)", async () => {
    const res = await request(app).get(`/api/v1/surveys/${surveyId}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(SURVEY_SCHEMA.title);
  });
});

describe("PUT /api/v1/surveys/:id", () => {
  it("updates survey title", async () => {
    const res = await request(app)
      .put(`/api/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated Title" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Title");
    expect(res.body.version).toBe(1);
  });

  it("increments version on schema change", async () => {
    const res = await request(app)
      .put(`/api/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ schema: SURVEY_SCHEMA });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
  });

  it("activates survey", async () => {
    const res = await request(app)
      .put(`/api/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ACTIVE" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ACTIVE");
  });
});

// ── Responses ───────────────────────────────────────────────────────────

describe("POST /api/v1/surveys/:id/responses", () => {
  it("submits a valid response (public fields only)", async () => {
    const res = await request(app)
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .send({
        answers: {
          q1: "Good",
          q2: 8,
          q3: 9,
          q5: ["Pay equity", "Flexibility"],
          q6: ["Inclusion", "Safety", "Growth", "Balance"],
          q7: { "Management is fair": 4, "Pay is equitable": 3 },
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.surveyId).toBe(surveyId);
  });

  it("rejects private field keys with 400", async () => {
    const res = await request(app)
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .send({
        answers: {
          q1: "Good",
          q4: "This is a private answer that should be rejected",
        },
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Private fields");
    expect(res.body.error).toContain("q4");
  });

  it("submits more responses for aggregation", async () => {
    const responses = [
      { q1: "Excellent", q2: 9, q3: 10, q5: ["Pay equity"], q6: ["Safety", "Inclusion", "Growth", "Balance"], q7: { "Management is fair": 5, "Pay is equitable": 4 } },
      { q1: "Good", q2: 7, q3: 6, q5: ["Promotion fairness", "Flexibility"], q6: ["Growth", "Balance", "Safety", "Inclusion"], q7: { "Management is fair": 3, "Pay is equitable": 2 } },
      { q1: "Fair", q2: 5, q3: 3, q5: ["Pay equity", "Parental leave"], q6: ["Balance", "Safety", "Inclusion", "Growth"], q7: { "Management is fair": 2, "Pay is equitable": 2 } },
    ];

    for (const answers of responses) {
      const res = await request(app)
        .post(`/api/v1/surveys/${surveyId}/responses`)
        .send({ answers });
      expect(res.status).toBe(201);
    }
  });

  it("rejects response to non-active survey", async () => {
    // Close the survey first, then try to submit
    await request(app)
      .put(`/api/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "CLOSED" });

    const res = await request(app)
      .post(`/api/v1/surveys/${surveyId}/responses`)
      .send({ answers: { q1: "Good" } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("not accepting responses");

    // Re-activate for aggregation test
    await request(app)
      .put(`/api/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ACTIVE" });
  });
});

// ── Aggregation ─────────────────────────────────────────────────────────

describe("GET /api/v1/surveys/:id/results", () => {
  it("returns aggregated results", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalResponses).toBe(4);
    expect(res.body.questions).toBeDefined();
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  it("aggregates choice correctly", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set("Authorization", `Bearer ${token}`);
    const q1 = res.body.questions.find((q: { questionId: string }) => q.questionId === "q1");
    expect(q1).toBeDefined();
    expect(q1.type).toBe("choice");
    expect(q1.data.Good).toBe(2);
    expect(q1.data.Excellent).toBe(1);
    expect(q1.data.Fair).toBe(1);
  });

  it("aggregates rating correctly", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set("Authorization", `Bearer ${token}`);
    const q2 = res.body.questions.find((q: { questionId: string }) => q.questionId === "q2");
    expect(q2).toBeDefined();
    expect(q2.type).toBe("rating");
    // Values: 8, 9, 7, 5 → avg = 7.25, median = 7.5
    expect(q2.data.avg).toBe(7.25);
    expect(q2.data.median).toBe(7.5);
    expect(q2.data.distribution).toBeDefined();
  });

  it("aggregates NPS correctly", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set("Authorization", `Bearer ${token}`);
    const q3 = res.body.questions.find((q: { questionId: string }) => q.questionId === "q3");
    expect(q3).toBeDefined();
    expect(q3.type).toBe("nps");
    // Values: 9, 10, 6, 3 → promoters=2, passives=0, detractors=2 → score=0
    expect(q3.data.promoters).toBe(2);
    expect(q3.data.detractors).toBe(2);
    expect(q3.data.score).toBe(0);
  });

  it("excludes private questions from results", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set("Authorization", `Bearer ${token}`);
    const q4 = res.body.questions.find((q: { questionId: string }) => q.questionId === "q4");
    expect(q4).toBeUndefined();
  });

  it("aggregates multi_choice correctly", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set("Authorization", `Bearer ${token}`);
    const q5 = res.body.questions.find((q: { questionId: string }) => q.questionId === "q5");
    expect(q5).toBeDefined();
    expect(q5.data["Pay equity"]).toBe(3);
    expect(q5.data["Flexibility"]).toBe(2);
  });

  it("aggregates ranking correctly", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set("Authorization", `Bearer ${token}`);
    const q6 = res.body.questions.find((q: { questionId: string }) => q.questionId === "q6");
    expect(q6).toBeDefined();
    // avgPosition — lower is better
    expect(typeof q6.data.Safety).toBe("number");
    expect(typeof q6.data.Inclusion).toBe("number");
  });

  it("requires auth", async () => {
    const res = await request(app).get(`/api/v1/surveys/${surveyId}/results`);
    expect(res.status).toBe(401);
  });
});

// ── Delete (soft) ───────────────────────────────────────────────────────

describe("DELETE /api/v1/surveys/:id", () => {
  it("soft deletes (archives) a survey", async () => {
    const res = await request(app)
      .delete(`/api/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ARCHIVED");
  });

  it("archived survey is excluded from list", async () => {
    const res = await request(app)
      .get(`/api/v1/surveys?org_id=${TEST_ORG_ID}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const found = res.body.find((s: { id: string }) => s.id === surveyId);
    expect(found).toBeUndefined();
  });

  it("cannot update archived survey", async () => {
    const res = await request(app)
      .put(`/api/v1/surveys/${surveyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Should fail" });
    expect(res.status).toBe(400);
  });
});
