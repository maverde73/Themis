"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getStoredUser } from "@/lib/auth";
import {
  getOrgRoles,
  getTeamMembers,
  createInvite,
  updateMemberPermissions,
  approveUser,
  type OrgRoleData,
  type TeamMember,
  type InviteResponse,
} from "@/lib/api";
import { getCachedKeypair } from "@/lib/crypto/key-sync";
import { deriveLevelKeys, encryptLevelKeyForUser } from "@/lib/crypto/level-keys";
import {
  Copy,
  Check,
  UserPlus,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  Crown,
  Scale,
  ClipboardList,
  Palette,
  Eye,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Display profiles for system roles (used in member list) ──────

interface RoleProfile {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const ROLE_PROFILES: Record<string, RoleProfile> = {
  rpg: { label: "Responsabile Parità", icon: Crown, color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/40" },
  odv: { label: "Organismo di Vigilanza", icon: Scale, color: "text-indigo-700 dark:text-indigo-400", bgColor: "bg-indigo-50 dark:bg-indigo-950/40" },
  technical: { label: "Collaboratore", icon: Wrench, color: "text-sky-700 dark:text-sky-400", bgColor: "bg-sky-50 dark:bg-sky-950/40" },
  admin: { label: "Amministratore", icon: Shield, color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/40" },
};

function getRoleProfile(role: string): RoleProfile {
  return ROLE_PROFILES[role.toLowerCase()] ?? ROLE_PROFILES.technical;
}

// ── Level styling (matches roles page) ──────────────────────────

interface LevelStyle {
  color: string;
  bgColor: string;
  borderColor: string;
  barColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LEVEL_STYLES: Record<number, LevelStyle> = {
  0: { color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-50 dark:bg-rose-950/40", borderColor: "border-rose-200 dark:border-rose-800/60", barColor: "bg-rose-500", icon: Lock },
  1: { color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/40", borderColor: "border-orange-200 dark:border-orange-800/60", barColor: "bg-orange-500", icon: ShieldAlert },
  2: { color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/40", borderColor: "border-amber-200 dark:border-amber-800/60", barColor: "bg-amber-500", icon: ShieldCheck },
  3: { color: "text-sky-700 dark:text-sky-400", bgColor: "bg-sky-50 dark:bg-sky-950/40", borderColor: "border-sky-200 dark:border-sky-800/60", barColor: "bg-sky-500", icon: Shield },
  4: { color: "text-indigo-700 dark:text-indigo-400", bgColor: "bg-indigo-50 dark:bg-indigo-950/40", borderColor: "border-indigo-200 dark:border-indigo-800/60", barColor: "bg-indigo-500", icon: Eye },
  5: { color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/40", borderColor: "border-emerald-200 dark:border-emerald-800/60", barColor: "bg-emerald-500", icon: Globe },
};

// ── Component ───────────────────────────────────────────────────

export default function TeamPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<OrgRoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCanEditSurveys, setInviteCanEditSurveys] = useState(false);
  const [inviteCanEditThemes, setInviteCanEditThemes] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCreating, setInviteCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedRole, setAdvancedRole] = useState<"rpg" | "odv" | null>(null);

  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const orgId = user?.orgId;

  const loadData = useCallback(async () => {
    if (!orgId) return;
    try {
      const [teamData, rolesData] = await Promise.all([
        getTeamMembers(),
        getOrgRoles(orgId),
      ]);
      setTeam(teamData);
      setRoles(rolesData);
    } catch {
      setError("Errore nel caricamento dei dati.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    loadData();
  }, [router, loadData]);

  function resetInvite() {
    setShowInvite(false);
    setSelectedRoleId(null);
    setInviteLink(null);
    setInviteEmail("");
    setInviteCanEditSurveys(false);
    setInviteCanEditThemes(false);
    setShowAdvanced(false);
    setAdvancedRole(null);
  }

  async function handleCreateInvite() {
    if (!orgId) return;

    // Determine system role and orgRoleId
    let systemRole = "technical";
    let orgRoleId: string | undefined;

    if (advancedRole) {
      systemRole = advancedRole;
    } else if (selectedRoleId) {
      orgRoleId = selectedRoleId;
    }

    setInviteCreating(true);
    setError(null);
    setInviteLink(null);
    try {
      const invite: InviteResponse = await createInvite(
        orgId,
        systemRole,
        inviteEmail || undefined,
        orgRoleId,
      );
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/register/${invite.token}`);
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella creazione dell'invito.");
    } finally {
      setInviteCreating(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggle(memberId: string, field: "canEditSurveys" | "canEditThemes", value: boolean) {
    setError(null);
    try {
      await updateMemberPermissions(memberId, { [field]: value });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'aggiornamento dei permessi.");
    }
  }

  async function handleChangeRole(memberId: string, orgRoleId: string | null) {
    setError(null);
    try {
      await updateMemberPermissions(memberId, { orgRoleId });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'aggiornamento del ruolo.");
    }
  }

  async function handleApprove(member: TeamMember) {
    if (!member.orgRole || !member.nostrPubkey) return;
    setError(null);
    try {
      // Get RPG's master key from IndexedDB
      const cached = await getCachedKeypair();
      if (!cached) {
        setError("Devi prima sbloccare le tue chiavi crittografiche (vai alla dashboard e sblocca).");
        return;
      }

      // Derive level keys from master key
      const { keys } = await deriveLevelKeys(cached.x25519Priv);
      const targetLevel = member.orgRole.dataLevel;
      const levelKey = keys[targetLevel];
      if (!levelKey) {
        setError("Impossibile derivare la chiave per questo livello.");
        return;
      }

      // Encrypt the level key for the user
      const encryptedLevelKey = await encryptLevelKeyForUser(levelKey, member.nostrPubkey);

      // Save via API
      await approveUser(member.id, encryptedLevelKey);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'approvazione.");
    }
  }

  const isMe = (id: string) => user?.id === id;
  const isPrivileged = user && ["RPG", "ADMIN", "SUPER_ADMIN"].includes(user.role.toUpperCase());
  const sortedRoles = [...roles].sort((a, b) => a.dataLevel - b.dataLevel);

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Invite */}
      <div className="mb-6">
        {!showInvite ? (
          <Button onClick={() => setShowInvite(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invita membro
          </Button>
        ) : (
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Invita un nuovo membro</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={resetInvite}>
                  Annulla
                </Button>
              </div>

              {/* Role selection from org roles */}
              <div className="mb-5">
                <Label className="mb-2.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Con quale ruolo?
                </Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedRoles.map((role) => {
                    const ls = LEVEL_STYLES[role.dataLevel] ?? LEVEL_STYLES[5];
                    const LevelIcon = ls.icon;
                    const selected = selectedRoleId === role.id && !advancedRole;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => { setSelectedRoleId(role.id); setAdvancedRole(null); }}
                        className={`
                          relative flex items-start gap-3 rounded-xl border p-3 pl-5 text-left transition-all overflow-hidden
                          ${ls.bgColor} ${ls.borderColor}
                          ${selected
                            ? `ring-2 ${ls.color} ring-current/30`
                            : "hover:ring-1 hover:ring-current/10"
                          }
                        `}
                      >
                        {/* Left accent bar */}
                        <div className={`absolute inset-y-0 left-0 w-1 ${ls.barColor}`} />
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ls.bgColor} border ${ls.borderColor}`}>
                          <LevelIcon className={`h-3.5 w-3.5 ${ls.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{role.name}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${ls.color}`}>
                              Liv. {role.dataLevel}
                            </span>
                          </div>
                          {role.description && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* "Solo editor" option — no data access */}
                  <button
                    type="button"
                    onClick={() => { setSelectedRoleId(null); setAdvancedRole(null); }}
                    className={`
                      relative flex items-start gap-3 rounded-xl border p-3 pl-5 text-left transition-all overflow-hidden border-dashed
                      ${!selectedRoleId && !advancedRole
                        ? "bg-muted/40 border-muted-foreground/30 ring-1 ring-muted-foreground/10"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }
                    `}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">Solo collaboratore</span>
                      <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                        Lavora su moduli e temi, senza accesso ai dati crittografati.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div className="mb-5">
                <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Permessi editor
                </Label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={inviteCanEditSurveys}
                      onChange={(e) => setInviteCanEditSurveys(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                    Può modificare moduli
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={inviteCanEditThemes}
                      onChange={(e) => setInviteCanEditThemes(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    Può modificare temi
                  </label>
                </div>
              </div>

              {/* Email + Create */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 max-w-xs">
                  <Label className="mb-1 text-sm">Email (opzionale)</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@esempio.com"
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateInvite} disabled={inviteCreating} className="gap-2">
                  {inviteCreating ? "Creazione..." : "Genera link invito"}
                </Button>
              </div>

              {/* Generated link */}
              {inviteLink && (
                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800/50 dark:bg-green-950/30">
                  <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">
                    Link di invito creato
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-black/20">
                      {inviteLink}
                    </code>
                    <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handleCopy}>
                      {copied ? (
                        <><Check className="h-3.5 w-3.5 text-green-600" /> Copiato</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copia</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Advanced: RPG/OdV */}
              <div className="mt-4 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Ruoli avanzati (RPG / OdV)
                </button>
                {showAdvanced && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => { setAdvancedRole("rpg"); setSelectedRoleId(null); }}
                      className={`
                        flex items-start gap-3 rounded-xl border p-3 text-left transition-all
                        ${advancedRole === "rpg"
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 ring-1 ring-amber-400/20 text-amber-700"
                          : "border-border hover:bg-muted/30"
                        }
                      `}
                    >
                      <Crown className={`mt-0.5 h-4 w-4 shrink-0 ${advancedRole === "rpg" ? "text-amber-600" : "text-muted-foreground"}`} />
                      <div>
                        <span className="text-sm font-medium">Responsabile Parità</span>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Accesso completo. Genera chiavi crittografiche proprie.
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAdvancedRole("odv"); setSelectedRoleId(null); }}
                      className={`
                        flex items-start gap-3 rounded-xl border p-3 text-left transition-all
                        ${advancedRole === "odv"
                          ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 ring-1 ring-indigo-400/20 text-indigo-700"
                          : "border-border hover:bg-muted/30"
                        }
                      `}
                    >
                      <Scale className={`mt-0.5 h-4 w-4 shrink-0 ${advancedRole === "odv" ? "text-indigo-600" : "text-muted-foreground"}`} />
                      <div>
                        <span className="text-sm font-medium">Organismo di Vigilanza</span>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Canale whistleblowing indipendente. Genera chiavi crittografiche proprie.
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Team members */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : team.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nessun membro nel team. Invita il primo!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {team.map((member) => {
            const me = isMe(member.id);
            const profile = getRoleProfile(member.role);
            const Icon = profile.icon;

            // For display: show orgRole name if available, otherwise system role label
            const displayRole = member.orgRole?.name ?? profile.label;
            const displayColor = member.orgRole
              ? (LEVEL_STYLES[member.orgRole.dataLevel] ?? LEVEL_STYLES[5]).color
              : profile.color;
            const displayBg = member.orgRole
              ? (LEVEL_STYLES[member.orgRole.dataLevel] ?? LEVEL_STYLES[5]).bgColor
              : profile.bgColor;

            return (
              <div
                key={member.id}
                className={`
                  group rounded-xl border transition-all
                  ${me ? "border-primary/20 bg-primary/[0.02]" : "border-border bg-card"}
                `}
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  {/* Avatar + Info */}
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${displayBg}`}>
                      <Icon className={`h-4 w-4 ${displayColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{member.email}</p>
                        {me && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">Tu</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${displayColor}`}>{displayRole}</span>
                        {member.orgRole && (
                          <>
                            <span className="text-xs text-muted-foreground/40">·</span>
                            <span className="text-xs text-muted-foreground">
                              Livello {member.orgRole.dataLevel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4 sm:gap-5">
                    {/* Org role selector */}
                    {!me && isPrivileged && (
                      <div className="hidden sm:block">
                        <select
                          value={member.orgRole?.id || ""}
                          onChange={(e) => handleChangeRole(member.id, e.target.value || null)}
                          className="rounded-lg border border-input bg-transparent px-2 py-1 text-xs"
                          title="Ruolo"
                        >
                          <option value="">Solo collaboratore</option>
                          {sortedRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name} (Liv. {role.dataLevel})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Permission toggles */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Può modificare i moduli">
                        <ClipboardList className="h-3 w-3" />
                        {me ? (
                          <span>{member.canEditSurveys ? "Sì" : "No"}</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={member.canEditSurveys}
                            onChange={(e) => handleToggle(member.id, "canEditSurveys", e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-input accent-primary"
                          />
                        )}
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Può modificare i temi">
                        <Palette className="h-3 w-3" />
                        {me ? (
                          <span>{member.canEditThemes ? "Sì" : "No"}</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={member.canEditThemes}
                            onChange={(e) => handleToggle(member.id, "canEditThemes", e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-input accent-primary"
                          />
                        )}
                      </label>
                    </div>

                    {/* Status + Approve */}
                    <div className="flex items-center gap-2 shrink-0">
                      {member.orgRole && !member.approvedAt && member.nostrPubkey ? (
                        <>
                          <Badge variant="destructive" className="text-[10px]">In attesa</Badge>
                          {isPrivileged && !me && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => handleApprove(member)}
                            >
                              Approva
                            </Button>
                          )}
                        </>
                      ) : member.approvedAt ? (
                        <Badge className="bg-green-600 text-[10px]">Approvato</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Attivo</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
