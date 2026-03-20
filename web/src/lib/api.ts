const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// ── Types ──────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
  };
}

export interface ReportMetadata {
  id: string;
  orgId: string;
  channel: "PDR125" | "WHISTLEBLOWING";
  category: string | null;
  status: string;
  identityRevealed: boolean | null;
  hasAttachments: boolean | null;
  receivedAt: string;
  slaAckDeadline: string | null;
  slaResponseDeadline: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { message?: string }).message ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── Auth ───────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
}

// ── Reports (metadata only — content is E2E encrypted) ─────────────────

export async function getReports(
  orgId: string,
  channel?: string,
): Promise<ReportMetadata[]> {
  const params = new URLSearchParams({ org_id: orgId });
  if (channel) {
    params.set("channel", channel);
  }
  const res = await fetch(`${API_URL}/reports/metadata?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<ReportMetadata[]>(res);
}

// ── Organizations ──────────────────────────────────────────────────────

export async function getOrganization(id: string): Promise<Organization> {
  const res = await fetch(`${API_URL}/organizations/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse<Organization>(res);
}

// ── Report status updates ──────────────────────────────────────────────

export async function updateReportStatus(
  id: string,
  status: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/reports/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  await handleResponse<void>(res);
}

// ── Invites ──────────────────────────────────────────────────────────────

export interface InviteResponse {
  id: string;
  orgId: string;
  role: string;
  token: string;
  expiresAt: string;
}

export interface SetupStatus {
  rpgConfigured: boolean;
  odvConfigured: boolean;
}

export async function createInvite(
  orgId: string,
  role: "rpg" | "odv",
): Promise<InviteResponse> {
  const res = await fetch(`${API_URL}/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, role }),
  });
  return handleResponse<InviteResponse>(res);
}

export async function getSetupStatus(orgId: string): Promise<SetupStatus> {
  const res = await fetch(`${API_URL}/organizations/${orgId}/setup-status`, {
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<SetupStatus>(res);
}

// ── Onboarding ──────────────────────────────────────────────────────────

export interface CreateOrganizationResponse {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export async function createOrganization(
  name: string,
  plan?: string,
): Promise<CreateOrganizationResponse> {
  const res = await fetch(`${API_URL}/organizations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, plan }),
  });
  return handleResponse<CreateOrganizationResponse>(res);
}

export async function uploadKeys(
  orgId: string,
  rpgPublicKey: string,
  odvPublicKey: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/organizations/${orgId}/keys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rpgPublicKey, odvPublicKey }),
  });
  await handleResponse<void>(res);
}

export interface PairingQrResponse {
  orgId: string;
  rpgPublicKey: string;
  odvPublicKey: string;
  relayUrls: string[];
}

export async function generatePairingQr(
  orgId: string,
): Promise<PairingQrResponse> {
  const res = await fetch(`${API_URL}/organizations/${orgId}/pairing-qr`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<PairingQrResponse>(res);
}

// ── Surveys ─────────────────────────────────────────────────────────────

export type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
export type FormKind = "SURVEY" | "REPORT";
export type FormChannel = "PDR125" | "WHISTLEBLOWING";

export interface Survey {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  schema: Record<string, unknown>;
  status: SurveyStatus;
  kind: FormKind;
  channel: FormChannel | null;
  icon: string | null;
  version: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSurveyData {
  orgId: string;
  title: string;
  description?: string;
  schema: Record<string, unknown>;
  kind?: FormKind;
  channel?: FormChannel;
  icon?: string;
}

export interface UpdateSurveyData {
  title?: string;
  description?: string;
  schema?: Record<string, unknown>;
  status?: SurveyStatus;
  kind?: FormKind;
  channel?: FormChannel | null;
  icon?: string | null;
}

export interface AggregatedQuestion {
  questionId: string;
  type: string;
  label: string;
  responseCount: number;
  data: Record<string, unknown> | null;
}

export interface SurveyResults {
  surveyId: string;
  title: string;
  version: number;
  totalResponses: number;
  questions: AggregatedQuestion[];
}

export async function getSurveys(orgId: string, kind?: FormKind): Promise<Survey[]> {
  const params = new URLSearchParams({ org_id: orgId });
  if (kind) params.set("kind", kind);
  const res = await fetch(`${API_URL}/surveys?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<Survey[]>(res);
}

export async function getSurveyById(id: string): Promise<Survey> {
  const res = await fetch(`${API_URL}/surveys/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse<Survey>(res);
}

export async function importTemplate(
  orgId: string,
  templateId: "pdr125" | "wb",
): Promise<Survey[]> {
  const res = await fetch(
    `${API_URL}/organizations/${orgId}/import-template`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ templateId }),
    },
  );
  return handleResponse<Survey[]>(res);
}

export async function createSurvey(data: CreateSurveyData): Promise<Survey> {
  const res = await fetch(`${API_URL}/surveys`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Survey>(res);
}

export async function updateSurvey(
  id: string,
  data: UpdateSurveyData,
): Promise<Survey> {
  const res = await fetch(`${API_URL}/surveys/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<Survey>(res);
}

export async function deleteSurvey(id: string): Promise<Survey> {
  const res = await fetch(`${API_URL}/surveys/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<Survey>(res);
}

export async function getSurveyResults(id: string): Promise<SurveyResults> {
  const res = await fetch(`${API_URL}/surveys/${id}/results`, {
    headers: authHeaders(),
  });
  return handleResponse<SurveyResults>(res);
}

// ── Analytics ───────────────────────────────────────────────────────────

export interface AnalyticsData {
  totalReports: number;
  byChannel: {
    PDR125: number;
    WB: number;
  };
  byStatus: Record<string, number>;
  slaCompliance: {
    onTime: number;
    overdue: number;
    rate: number;
  };
}

export async function getAnalytics(orgId: string): Promise<AnalyticsData> {
  const res = await fetch(`${API_URL}/analytics/${orgId}`, {
    headers: authHeaders(),
  });
  return handleResponse<AnalyticsData>(res);
}
