"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getStoredUser } from "@/lib/auth";
import {
  getOrgRoles,
  createOrgRole,
  updateOrgRole,
  deleteOrgRole,
  type OrgRoleData,
} from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import {
  Plus,
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Users,
  Globe,
  Lock,
  GripVertical,
} from "lucide-react";

// ── Level metadata ──────────────────────────────────────────────────

interface LevelMeta {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  barColor: string;
  dropHighlight: string;
}

const LEVEL_META: Record<number, LevelMeta> = {
  0: {
    label: "Massima riservatezza",
    description: "Dati identificativi e fatti completi",
    icon: Lock,
    color: "text-rose-700 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/40",
    borderColor: "border-rose-200 dark:border-rose-800/60",
    barColor: "bg-rose-500",
    dropHighlight: "ring-rose-400/50",
  },
  1: {
    label: "Riservato",
    description: "Dati sensibili specifici",
    icon: ShieldAlert,
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/40",
    borderColor: "border-orange-200 dark:border-orange-800/60",
    barColor: "bg-orange-500",
    dropHighlight: "ring-orange-400/50",
  },
  2: {
    label: "Istruttoria",
    description: "Fatti senza identità segnalante",
    icon: ShieldCheck,
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    borderColor: "border-amber-200 dark:border-amber-800/60",
    barColor: "bg-amber-500",
    dropHighlight: "ring-amber-400/50",
  },
  3: {
    label: "Operativo",
    description: "Gestione corrente",
    icon: Shield,
    color: "text-sky-700 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-950/40",
    borderColor: "border-sky-200 dark:border-sky-800/60",
    barColor: "bg-sky-500",
    dropHighlight: "ring-sky-400/50",
  },
  4: {
    label: "Supervisione",
    description: "KPI aggregati e conformità",
    icon: Eye,
    color: "text-indigo-700 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
    borderColor: "border-indigo-200 dark:border-indigo-800/60",
    barColor: "bg-indigo-500",
    dropHighlight: "ring-indigo-400/50",
  },
  5: {
    label: "Pubblico",
    description: "Aggregati visibili a tutti",
    icon: Globe,
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    borderColor: "border-emerald-200 dark:border-emerald-800/60",
    barColor: "bg-emerald-500",
    dropHighlight: "ring-emerald-400/50",
  },
};

// Trapezoid widths: level 0 is narrowest, level 5 is widest
const TIER_MAX_WIDTH: Record<number, string> = {
  0: "max-w-[55%]",
  1: "max-w-[64%]",
  2: "max-w-[73%]",
  3: "max-w-[82%]",
  4: "max-w-[91%]",
  5: "max-w-full",
};

// ── Component ───────────────────────────────────────────────────────

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<OrgRoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createLevel, setCreateLevel] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Inline edit
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Drag & drop
  const [dragRoleId, setDragRoleId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const orgId =
    typeof window !== "undefined" ? getStoredUser()?.orgId : null;

  const loadRoles = useCallback(async () => {
    if (!orgId) return;
    try {
      const data = await getOrgRoles(orgId);
      setRoles(data);
    } catch {
      setError("Errore nel caricamento dei ruoli.");
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
    loadRoles();
  }, [router, loadRoles]);

  // ── Create ──────────────────────────────────────────────────────

  function openCreateFor(level: number) {
    setCreateLevel(level);
    setShowCreate(true);
    setName("");
    setDescription("");
    setError(null);
  }

  function closeCreate() {
    setShowCreate(false);
    setCreateLevel(null);
    setName("");
    setDescription("");
  }

  async function handleCreate() {
    if (!orgId || !name.trim() || createLevel === null) return;
    setCreating(true);
    setError(null);
    try {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      await createOrgRole({ orgId, name: name.trim(), slug, description: description.trim() || undefined, dataLevel: createLevel });
      closeCreate();
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nella creazione del ruolo.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteOrgRole(id);
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nell'eliminazione del ruolo.");
    }
  }

  // ── Inline Edit ──────────────────────────────────────────────────

  function startEdit(role: OrgRoleData) {
    setEditingRoleId(role.id);
    setEditName(role.name);
    setEditDescription(role.description || "");
  }

  function cancelEdit() {
    setEditingRoleId(null);
    setEditName("");
    setEditDescription("");
  }

  async function handleSaveEdit() {
    if (!editingRoleId || !editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrgRole(editingRoleId, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      cancelEdit();
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio.");
    } finally {
      setSaving(false);
    }
  }

  // ── Drag & Drop ─────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, role: OrgRoleData) {
    if (role.isBuiltin) {
      e.preventDefault();
      return;
    }
    setDragRoleId(role.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", role.id);
  }

  function handleDragEnd() {
    setDragRoleId(null);
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, level: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(level);
  }

  function handleDragLeave(e: React.DragEvent, level: number) {
    // Only clear if we're actually leaving the tier (not entering a child)
    const related = e.relatedTarget as HTMLElement | null;
    if (related && e.currentTarget.contains(related)) return;
    if (dropTarget === level) setDropTarget(null);
  }

  async function handleDrop(e: React.DragEvent, targetLevel: number) {
    e.preventDefault();
    setDropTarget(null);
    const roleId = e.dataTransfer.getData("text/plain");
    if (!roleId) return;

    const role = roles.find((r) => r.id === roleId);
    if (!role || role.isBuiltin || role.dataLevel === targetLevel) return;

    setError(null);
    try {
      await updateOrgRole(roleId, { dataLevel: targetLevel });
      await loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nello spostamento del ruolo.");
    }
    setDragRoleId(null);
  }

  // Group roles by level
  const rolesByLevel: Record<number, OrgRoleData[]> = {};
  for (let i = 0; i <= 5; i++) rolesByLevel[i] = [];
  for (const role of roles) {
    if (rolesByLevel[role.dataLevel]) {
      rolesByLevel[role.dataLevel].push(role);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Explanation */}
      <Card className="mb-8 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Come funziona:</span>{" "}
              chi ha un ruolo al livello <strong>N</strong> può vedere tutti i campi con livello{" "}
              <strong>da N a 5</strong>.
              {" "}Trascina i ruoli tra i livelli per cambiarne l{"'"}accesso.
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-16 w-full animate-pulse rounded-xl bg-muted/60 ${TIER_MAX_WIDTH[i]}`}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {[0, 1, 2, 3, 4, 5].map((level) => {
            const meta = LEVEL_META[level];
            const Icon = meta.icon;
            const levelRoles = rolesByLevel[level];
            const isCreating = showCreate && createLevel === level;
            const isDragOver = dropTarget === level && dragRoleId !== null;
            const draggedRole = dragRoleId ? roles.find((r) => r.id === dragRoleId) : null;
            const isDragSourceLevel = draggedRole?.dataLevel === level;

            return (
              <div
                key={level}
                className={`w-full transition-all duration-300 ${TIER_MAX_WIDTH[level]}`}
                onDragOver={(e) => handleDragOver(e, level)}
                onDragLeave={(e) => handleDragLeave(e, level)}
                onDrop={(e) => handleDrop(e, level)}
              >
                <div
                  className={`
                    group relative rounded-xl border transition-all duration-200
                    ${meta.borderColor} ${meta.bgColor}
                    ${isCreating ? "ring-2 ring-primary/30" : ""}
                    ${isDragOver && !isDragSourceLevel ? `ring-2 ${meta.dropHighlight} scale-[1.02]` : ""}
                  `}
                >
                  {/* Accent bar */}
                  <div
                    className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${meta.barColor}`}
                  />

                  <div className="flex flex-col gap-2 py-3 pl-5 pr-4 sm:flex-row sm:items-center">
                    {/* Level indicator */}
                    <div className="flex shrink-0 items-center gap-3 sm:w-48">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.bgColor} border ${meta.borderColor}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}
                        >
                          Liv. {level}
                        </span>
                        <p className="truncate text-sm font-medium leading-tight text-foreground">
                          {meta.label}
                        </p>
                      </div>
                    </div>

                    {/* Description (hidden on small) */}
                    <p className="hidden flex-1 text-xs text-muted-foreground lg:block">
                      {meta.description}
                    </p>

                    {/* Role chips */}
                    <div className="flex flex-1 flex-wrap items-center gap-1.5 sm:justify-end">
                      {levelRoles.map((role) => {
                        const isDragging = dragRoleId === role.id;
                        const isEditing = editingRoleId === role.id;

                        if (isEditing) {
                          return (
                            <form
                              key={role.id}
                              className="flex items-center gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSaveEdit();
                              }}
                            >
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Nome..."
                                className="h-7 w-28 text-sm"
                                autoFocus
                              />
                              <Input
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Descrizione..."
                                className="hidden h-7 w-44 text-sm lg:block"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                disabled={saving || !editName.trim()}
                              >
                                {saving ? "..." : "Salva"}
                              </Button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          );
                        }

                        return (
                          <div
                            key={role.id}
                            draggable={!role.isBuiltin && !isEditing}
                            onDragStart={(e) => handleDragStart(e, role)}
                            onDragEnd={handleDragEnd}
                            onDoubleClick={() => startEdit(role)}
                            title="Doppio click per modificare"
                            className={`
                              inline-flex flex-col rounded-lg border px-2.5 py-1.5
                              transition-all select-none max-w-56
                              ${role.isBuiltin
                                ? `${meta.borderColor} bg-white/80 dark:bg-white/5`
                                : `${meta.borderColor} bg-white/60 dark:bg-white/5 border-dashed cursor-grab active:cursor-grabbing`
                              }
                              ${isDragging ? "opacity-40 scale-95" : ""}
                            `}
                          >
                            <div className="flex items-center gap-1.5">
                              {!role.isBuiltin && (
                                <GripVertical className="h-3 w-3 text-muted-foreground/40" />
                              )}
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm font-medium">{role.name}</span>
                              {role.isBuiltin && (
                                <Badge
                                  variant="secondary"
                                  className="ml-0.5 h-4 px-1 text-[10px]"
                                >
                                  Fisso
                                </Badge>
                              )}
                              {role._count?.users !== undefined && role._count.users > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({role._count.users})
                                </span>
                              )}
                              {!role.isBuiltin && (
                                <button
                                  onClick={() => handleDelete(role.id)}
                                  className="ml-auto rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="Elimina ruolo"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                            </div>
                            {role.description && (
                              <p className="text-[11px] leading-tight text-muted-foreground font-normal mt-0.5 line-clamp-2">
                                {role.description}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {/* Inline create */}
                      {isCreating ? (
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleCreate();
                          }}
                        >
                          <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nome ruolo..."
                            className="h-7 w-28 text-sm"
                            autoFocus
                          />
                          <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descrizione..."
                            className="hidden h-7 w-44 text-sm lg:block"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            disabled={creating || !name.trim()}
                          >
                            {creating ? "..." : "Crea"}
                          </Button>
                          <button
                            type="button"
                            onClick={closeCreate}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => openCreateFor(level)}
                          className={`
                            inline-flex items-center gap-1 rounded-lg border border-dashed px-2 py-1
                            text-xs text-muted-foreground transition-all
                            hover:border-primary/40 hover:text-primary hover:bg-primary/5
                            ${meta.borderColor}
                          `}
                          title={`Aggiungi ruolo al livello ${level}`}
                        >
                          <Plus className="h-3 w-3" />
                          <span className="hidden sm:inline">Aggiungi</span>
                        </button>
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
