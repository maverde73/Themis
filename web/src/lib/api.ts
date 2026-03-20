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
  orgName: string;
  rpgPublicKey: string;
  odvPublicKey: string;
  pairingToken: string;
  serverUrl: string;
}

export async function generatePairingQr(
  orgId: string,
): Promise<PairingQrResponse> {
  const res = await fetch(`${API_URL}/organizations/${orgId}/pairing-qr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<PairingQrResponse>(res);
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
