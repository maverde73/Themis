const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// ── Types ──────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string | null;
    canEditSurveys?: boolean;
    canEditThemes?: boolean;
    dataLevel?: number | null;
    orgRoleName?: string | null;
    encryptedLevelKey?: string | null;
    approvedAt?: string | null;
  };
}

export type ReportStatusEnum =
  | "RECEIVED"
  | "ACKNOWLEDGED"
  | "INVESTIGATING"
  | "RESPONSE_GIVEN"
  | "CLOSED_FOUNDED"
  | "CLOSED_UNFOUNDED"
  | "CLOSED_BAD_FAITH";

export interface PaginatedReports {
  items: ReportMetadata[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportMetadata {
  id: string;
  orgId: string;
  channel: "PDR125" | "WHISTLEBLOWING";
  category: string | null;
  status: ReportStatusEnum;
  identityRevealed: boolean | null;
  hasAttachments: boolean | null;
  receivedAt: string;
  acknowledgedAt: string | null;
  responseGivenAt: string | null;
  closedAt: string | null;
  slaAckDeadline: string | null;
  slaResponseDeadline: string | null;
  slaAckMet: boolean | null;
  slaResponseMet: boolean | null;
  nostrPubkey: string | null;
}

export interface ReportMetadataDetail extends ReportMetadata {
  slaAckDaysRemaining: number | null;
  slaAckOverdue: boolean;
  slaResponseDaysRemaining: number | null;
  slaResponseOverdue: boolean;
  validNextStatuses: ReportStatusEnum[];
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

// ── Paginated reports listing ──────────────────────────────────────────

export interface ReportListOptions {
  channel?: string;
  status?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: "receivedAt" | "status";
  sort_dir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function getReportsPaginated(
  orgId: string,
  options?: ReportListOptions,
): Promise<PaginatedReports> {
  const params = new URLSearchParams({ org_id: orgId });
  if (options) {
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
  }
  const res = await fetch(`${API_URL}/reports/metadata?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<PaginatedReports>(res);
}

// ── Report detail ─────────────────────────────────────────────────────

export async function getReportDetail(
  id: string,
): Promise<ReportMetadataDetail> {
  const res = await fetch(`${API_URL}/reports/metadata/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse<ReportMetadataDetail>(res);
}

// ── Report status updates ──────────────────────────────────────────────

export async function updateReportStatus(
  id: string,
  status: string,
): Promise<ReportMetadata> {
  const res = await fetch(`${API_URL}/reports/metadata/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse<ReportMetadata>(res);
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
  role: string,
  email?: string,
  orgRoleId?: string,
): Promise<InviteResponse> {
  const res = await fetch(`${API_URL}/invites`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ orgId, role, email, orgRoleId }),
  });
  return handleResponse<InviteResponse>(res);
}

export interface InviteInfo {
  orgId: string;
  orgName: string;
  role: string;
  email: string | null;
  orgRoleId: string | null;
}

export async function getInviteInfo(token: string): Promise<InviteInfo> {
  const res = await fetch(`${API_URL}/invites/${token}`);
  return handleResponse<InviteInfo>(res);
}

export async function registerViaInvite(
  token: string,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/invites/${token}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
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

// ── Themes ──────────────────────────────────────────────────────────────

export interface ThemeColors {
  pageBackground: string;
  surface: string;
  primary: string;
  primaryHover: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  inputBackground: string;
  inputBorder: string;
  inputFocus: string;
  selectionHighlight: string;
  required: string;
  surveyBackground: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontFamilyHeading: string | null;
  titleSize: string;
  titleWeight: string | number;
  subtitleSize: string;
  subtitleWeight: string | number;
  sectionTitleSize: string;
  sectionTitleWeight: string | number;
  labelSize: string;
  labelWeight: string | number;
  bodySize: string;
  bodyWeight: string | number;
  lineHeight: string | number;
}

export interface ThemeSpacing {
  formMaxWidth: string;
  formPadding: string;
  formPaddingMobile: string;
  sectionGap: string;
  fieldGap: string;
  borderRadius: string;
  inputPadding: string;
  inputBorderRadius: string;
  inputBorderWidth: string;
}

export interface ThemeButtons {
  backgroundColor: string;
  textColor: string;
  hoverBackgroundColor: string;
  borderRadius: string;
  padding: string;
  fontSize: string;
  fontWeight: string | number;
  textTransform: "none" | "uppercase" | "capitalize";
}

export interface ThemeCard {
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: string;
  borderRadius: string;
  shadow: string;
  padding: string;
}

export interface ThemeDecoration {
  type: "none" | "builtin" | "url";
  builtinId: string | null;
  url: string | null;
  position: "right" | "left" | "background";
  opacity: number;
  size: "small" | "medium" | "large";
}

export interface ThemeConfig {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  buttons: ThemeButtons;
  card: ThemeCard;
  decoration: ThemeDecoration;
}

export interface SurveyTheme {
  id: string;
  name: string;
  description: string | null;
  config: ThemeConfig;
  isBuiltin: boolean;
  isPublic: boolean;
  clonedFrom: string | null;
  createdBy: string | null;
  orgId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeListResponse {
  themes: SurveyTheme[];
  total: number;
  page: number;
  limit: number;
}

export async function getThemes(orgId: string): Promise<ThemeListResponse> {
  const params = new URLSearchParams({ org_id: orgId });
  const res = await fetch(`${API_URL}/themes?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<ThemeListResponse>(res);
}

export async function getThemeById(id: string): Promise<SurveyTheme> {
  const res = await fetch(`${API_URL}/themes/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse<SurveyTheme>(res);
}

export async function getDefaultThemeConfig(): Promise<ThemeConfig> {
  const res = await fetch(`${API_URL}/themes/defaults`, {
    headers: authHeaders(),
  });
  return handleResponse<ThemeConfig>(res);
}

export async function createTheme(data: {
  name: string;
  description?: string | null;
  isPublic?: boolean;
  config?: Partial<ThemeConfig>;
}): Promise<SurveyTheme> {
  const res = await fetch(`${API_URL}/themes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<SurveyTheme>(res);
}

export async function updateTheme(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    isPublic?: boolean;
    config?: Partial<ThemeConfig>;
  },
): Promise<SurveyTheme> {
  const res = await fetch(`${API_URL}/themes/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<SurveyTheme>(res);
}

export async function patchThemeSection(
  id: string,
  section: string,
  data: Record<string, unknown>,
): Promise<SurveyTheme> {
  const res = await fetch(`${API_URL}/themes/${id}/config/${section}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<SurveyTheme>(res);
}

export async function cloneTheme(
  id: string,
  name?: string,
): Promise<SurveyTheme> {
  const res = await fetch(`${API_URL}/themes/${id}/clone`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });
  return handleResponse<SurveyTheme>(res);
}

export async function deleteTheme(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/themes/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ||
        `Request failed with status ${res.status}`,
    );
  }
}

export async function applyThemeToSurvey(
  surveyId: string,
  themeId: string | null,
): Promise<Survey> {
  const res = await fetch(`${API_URL}/surveys/${surveyId}/theme`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ themeId }),
  });
  return handleResponse<Survey>(res);
}

// ── Surveys ─────────────────────────────────────────────────────────────

export type SurveyStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
export type FormChannel = "PDR125" | "WHISTLEBLOWING";

export interface Survey {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  schema: Record<string, unknown>;
  status: SurveyStatus;
  channel: FormChannel | null;
  icon: string | null;
  themeId: string | null;
  theme: { id: string; name: string; config: ThemeConfig } | null;
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
  channel?: FormChannel;
  icon?: string;
  themeId?: string | null;
}

export interface UpdateSurveyData {
  title?: string;
  description?: string;
  schema?: Record<string, unknown>;
  status?: SurveyStatus;
  channel?: FormChannel | null;
  icon?: string | null;
  themeId?: string | null;
}

export interface OptionMeta {
  value: string;
  label: string | Record<string, string>;
}

export interface AggregatedQuestion {
  questionId: string;
  type: string;
  label: string;
  responseCount: number;
  data: Record<string, unknown> | null;
  options?: OptionMeta[];
}

export interface SurveyResults {
  surveyId: string;
  title: string;
  version: number;
  totalResponses: number;
  createdAt?: string;
  responsesByMonth?: Record<string, number>;
  questions: AggregatedQuestion[];
}

export async function getSurveys(orgId: string): Promise<Survey[]> {
  const params = new URLSearchParams({ org_id: orgId });
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

export interface TemplateCatalogEntry {
  id: string;
  slug: string;
  channel?: string | null;
  icon: string | null;
  catalogTitle: Record<string, string>;
  catalogDescription: Record<string, string>;
}

export async function listTemplates(): Promise<TemplateCatalogEntry[]> {
  const res = await fetch(`${API_URL}/templates`);
  return handleResponse<TemplateCatalogEntry[]>(res);
}

export async function importTemplate(
  orgId: string,
  templateId: string,
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

export async function exportSurveyResultsPdf(id: string): Promise<Blob> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/surveys/${id}/results/export`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Export failed with status ${res.status}`);
  }
  return res.blob();
}

// ── Public surveys (no auth) ────────────────────────────────────────────

export async function getPublicSurvey(id: string): Promise<Survey> {
  const res = await fetch(`${API_URL}/public/surveys/${id}`);
  return handleResponse<Survey>(res);
}

export async function submitPublicResponse(
  surveyId: string,
  answers: Record<string, unknown>,
): Promise<{ id: string; surveyId: string }> {
  const res = await fetch(`${API_URL}/public/surveys/${surveyId}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  return handleResponse<{ id: string; surveyId: string }>(res);
}

// ── Nostr config (public) ────────────────────────────────────────────────

export interface NostrConfigResponse {
  relayUrls: string[];
  serverPubKey: string;
  serverX25519PubKey: string;
  powDifficulty: number;
  recipientPubKey: string | null;
  levelPubKeys: Record<string, string | null> | null;
}

export async function getNostrConfig(surveyId: string): Promise<NostrConfigResponse> {
  const res = await fetch(`${API_URL}/public/surveys/${surveyId}/nostr-config`);
  return handleResponse<NostrConfigResponse>(res);
}

// ── Admin ────────────────────────────────────────────────────────────────

export interface AdminOrganization {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
  _count: { users: number; surveys: number };
}

export interface AdminOrganizationDetail extends AdminOrganization {
  users: { id: string; email: string; role: string; createdAt: string }[];
  _count: { users: number; surveys: number; reportMetadata: number };
}

export async function adminListOrganizations(): Promise<AdminOrganization[]> {
  const res = await fetch(`${API_URL}/admin/organizations`, {
    headers: authHeaders(),
  });
  return handleResponse<AdminOrganization[]>(res);
}

export async function adminCreateOrganization(
  name: string,
  plan?: string,
): Promise<CreateOrganizationResponse> {
  const res = await fetch(`${API_URL}/admin/organizations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, plan }),
  });
  return handleResponse<CreateOrganizationResponse>(res);
}

export async function adminGetOrganization(
  id: string,
): Promise<AdminOrganizationDetail> {
  const res = await fetch(`${API_URL}/admin/organizations/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse<AdminOrganizationDetail>(res);
}

// ── Key Management ──────────────────────────────────────────────────────

export interface KeyBlobData {
  encryptedKeyBlob: string | null;
  nostrPubkey: string | null;
  keyBackupCompleted: boolean;
}

export async function getKeyBlob(): Promise<KeyBlobData> {
  const res = await fetch(`${API_URL}/users/me/key-blob`, {
    headers: authHeaders(),
  });
  return handleResponse<KeyBlobData>(res);
}

export async function saveKeyBlob(
  encryptedKeyBlob: string,
  nostrPubkey: string,
  keyBackupCompleted?: boolean,
): Promise<KeyBlobData> {
  const res = await fetch(`${API_URL}/users/me/key-blob`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ encryptedKeyBlob, nostrPubkey, keyBackupCompleted }),
  });
  return handleResponse<KeyBlobData>(res);
}

export async function markKeyBackupCompleted(): Promise<void> {
  const res = await fetch(`${API_URL}/users/me/key-backup`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  await handleResponse<void>(res);
}

// ── Nostr Private Events ─────────────────────────────────────────────────

export interface PrivateNostrEvent {
  id: string;
  content: string;
  createdAt: number;
  pubkey: string;
}

export async function getPrivateEvents(
  limit = 100,
  offset = 0,
): Promise<PrivateNostrEvent[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${API_URL}/nostr-events/private?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<PrivateNostrEvent[]>(res);
}

// ── Nostr event by pubkey (for case detail decryption) ──────────────────

export async function getNostrEventByPubkey(
  pubkey: string,
): Promise<PrivateNostrEvent | null> {
  const res = await fetch(`${API_URL}/nostr-events/by-pubkey/${pubkey}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  return handleResponse<PrivateNostrEvent>(res);
}

// ── Claim invite with public key (after keypair setup) ──────────────────

export async function claimInviteWithKey(
  token: string,
  publicKey: string,
): Promise<{ success: boolean; role: string }> {
  const res = await fetch(`${API_URL}/invites/${token}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey }),
  });
  return handleResponse<{ success: boolean; role: string }>(res);
}

// ── Dashboards ──────────────────────────────────────────────────────────

export interface DashboardData {
  id: string;
  orgId: string;
  surveyId: string | null;
  channel: string | null;
  title: string;
  config: unknown;
  accessLevel: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedWidget {
  type: string;
  title: string;
  data: unknown;
  accessLevel: number;
}

export interface ResolvedSection {
  title: string;
  columns?: number;
  widgets: ResolvedWidget[];
}

export interface DashboardWithData extends DashboardData {
  resolvedData: {
    sections: ResolvedSection[];
  };
}

export interface DashboardTemplateData {
  id: string;
  slug: string;
  catalogTitle: Record<string, string>;
  catalogDescription: Record<string, string>;
}

export async function getDashboards(
  orgId: string,
  surveyId?: string,
  channel?: string,
): Promise<DashboardData[]> {
  const params = new URLSearchParams({ org_id: orgId });
  if (surveyId) params.set("survey_id", surveyId);
  if (channel) params.set("channel", channel);
  const res = await fetch(`${API_URL}/dashboards?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<DashboardData[]>(res);
}

export async function getDashboardData(
  id: string,
  accessLevel = 1,
): Promise<DashboardWithData> {
  const params = new URLSearchParams({ access_level: String(accessLevel) });
  const res = await fetch(`${API_URL}/dashboards/${id}/data?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<DashboardWithData>(res);
}

export async function createDashboard(data: {
  orgId: string;
  title: string;
  config: unknown;
  surveyId?: string;
  channel?: string;
  accessLevel?: number;
  isDefault?: boolean;
}): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/dashboards`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<DashboardData>(res);
}

export async function updateDashboard(
  id: string,
  data: { title?: string; config?: unknown; accessLevel?: number; isDefault?: boolean },
): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/dashboards/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<DashboardData>(res);
}

export async function deleteDashboard(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/dashboards/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse<void>(res);
}

export async function getDashboardTemplates(): Promise<DashboardTemplateData[]> {
  const res = await fetch(`${API_URL}/dashboard-templates`, {
    headers: authHeaders(),
  });
  return handleResponse<DashboardTemplateData[]>(res);
}

export async function importDashboardTemplate(
  orgId: string,
  templateId: string,
): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/dashboards/import-template`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ orgId, templateId }),
  });
  return handleResponse<DashboardData>(res);
}

// ── Org Roles ──────────────────────────────────────────────────────────

export interface OrgRoleData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  dataLevel: number;
  isBuiltin: boolean;
  levelPubKey: string | null;
  _count?: { users: number };
}

export async function getOrgRoles(orgId: string): Promise<OrgRoleData[]> {
  const params = new URLSearchParams({ org_id: orgId });
  const res = await fetch(`${API_URL}/org-roles?${params}`, {
    headers: authHeaders(),
  });
  return handleResponse<OrgRoleData[]>(res);
}

export async function createOrgRole(data: {
  orgId: string;
  name: string;
  slug: string;
  description?: string;
  dataLevel: number;
}): Promise<OrgRoleData> {
  const res = await fetch(`${API_URL}/org-roles`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<OrgRoleData>(res);
}

export async function updateOrgRole(
  id: string,
  data: { name?: string; description?: string | null; dataLevel?: number },
): Promise<OrgRoleData> {
  const res = await fetch(`${API_URL}/org-roles/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<OrgRoleData>(res);
}

export async function deleteOrgRole(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/org-roles/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `Request failed with status ${res.status}`,
    );
  }
}

// ── Team Management ────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  orgRole: OrgRoleData | null;
  canEditSurveys: boolean;
  canEditThemes: boolean;
  nostrPubkey: string | null;
  encryptedLevelKey: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch(`${API_URL}/users/team`, {
    headers: authHeaders(),
  });
  return handleResponse<TeamMember[]>(res);
}

export async function updateMemberPermissions(
  userId: string,
  data: { canEditSurveys?: boolean; canEditThemes?: boolean; orgRoleId?: string | null },
): Promise<TeamMember> {
  const res = await fetch(`${API_URL}/users/${userId}/permissions`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<TeamMember>(res);
}

export async function approveUser(
  userId: string,
  encryptedLevelKey: string,
): Promise<unknown> {
  const res = await fetch(`${API_URL}/users/${userId}/approve`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ encryptedLevelKey }),
  });
  return handleResponse<unknown>(res);
}

export async function saveLevelPubKeys(
  orgId: string,
  levelPubKeys: Record<string, string | null>,
): Promise<void> {
  const res = await fetch(`${API_URL}/organizations/${orgId}/level-pubkeys`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ levelPubKeys }),
  });
  await handleResponse<unknown>(res);
}

// ── Report exports ──────────────────────────────────────────────────────

export interface ExportRegistroOptions {
  from?: string;
  to?: string;
  channel?: string;
  format?: "pdf" | "json";
}

export async function exportRegistroPdf(
  orgId: string,
  options?: ExportRegistroOptions,
): Promise<Blob> {
  const params = new URLSearchParams({ org_id: orgId });
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  if (options?.channel) params.set("channel", options.channel);
  // Always PDF for this function
  params.set("format", "pdf");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/reports/export/registro?${params}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Export failed with status ${res.status}`);
  }
  return res.blob();
}

export async function exportSchedaDatiPdf(
  orgId: string,
  from?: string,
  to?: string,
): Promise<Blob> {
  const params = new URLSearchParams({ org_id: orgId, format: "pdf" });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/reports/export/scheda-dati?${params}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Export failed with status ${res.status}`);
  }
  return res.blob();
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
