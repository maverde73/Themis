"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Palette,
  Building2,
  FileWarning,
  Lock,
  LockOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth, getStoredUser } from "@/lib/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hideForRoles?: string[];
  requirePermission?: "canEditSurveys" | "canEditThemes";
  requireDataLevel?: boolean;
}

export interface SidebarProps {
  title: string;
  items: NavItem[];
  showCryptoLock?: boolean;
}

function CryptoLock() {
  // Lazy-load to avoid hard dependency — only rendered when CryptoProvider wraps the tree
  const [hook, setHook] = useState<(() => { isUnlocked: boolean; loading: boolean; unlock: (pw: string) => Promise<void>; lock: () => Promise<void> }) | null>(null);

  useEffect(() => {
    import("@/lib/crypto/crypto-context").then((m) => setHook(() => m.useCrypto)).catch(() => {});
  }, []);

  if (!hook) return null;
  return <CryptoLockInner useCrypto={hook} />;
}

function CryptoLockInner({ useCrypto }: { useCrypto: () => { isUnlocked: boolean; loading: boolean; unlock: (pw: string) => Promise<void>; lock: () => Promise<void> } }) {
  const { isUnlocked, loading, unlock, lock } = useCrypto();
  const [showPrompt, setShowPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPrompt && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showPrompt]);

  async function handleUnlock() {
    if (!password) return;
    setError(null);
    setUnlocking(true);
    try {
      await unlock(password);
      setShowPrompt(false);
      setPassword("");
    } catch {
      setError("Password non corretta");
    } finally {
      setUnlocking(false);
    }
  }

  async function handleLock() {
    await lock();
  }

  function handleToggle() {
    if (isUnlocked) {
      handleLock();
    } else {
      setShowPrompt(true);
      setError(null);
      setPassword("");
    }
  }

  if (loading) return null;

  return (
    <div className="px-4 pb-3">
      {!showPrompt ? (
        <button
          type="button"
          onClick={handleToggle}
          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
            isUnlocked
              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          {isUnlocked ? (
            <LockOpen className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          {isUnlocked ? "Chiavi sbloccate" : "Sblocca chiavi"}
        </button>
      ) : (
        <div className="rounded-md border border-sidebar-border bg-background/50 p-2.5">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="password"
              placeholder="Password chiave"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              disabled={unlocking}
              className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleUnlock}
              disabled={!password || unlocking}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {unlocking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          {error && (
            <p className="mt-1.5 text-xs text-destructive">{error}</p>
          )}
          <button
            type="button"
            onClick={() => setShowPrompt(false)}
            className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Annulla
          </button>
        </div>
      )}
    </div>
  );
}

export const rpgNavItems: NavItem[] = [
  { label: "Dashboard", href: "/rpg/dashboard", icon: BarChart3, requireDataLevel: true },
  { label: "Segnalazioni", href: "/rpg/cases", icon: FileWarning, requireDataLevel: true },
  { label: "Moduli", href: "/rpg/surveys", icon: ClipboardList, requirePermission: "canEditSurveys" },
  { label: "Temi", href: "/rpg/surveys/themes", icon: Palette, requirePermission: "canEditThemes" },
  { label: "Impostazioni", href: "/rpg/settings", icon: Settings, hideForRoles: ["TECHNICAL"] },
];

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Organizzazioni", href: "/admin/organizations", icon: Building2 },
];

export const odvNavItems: NavItem[] = [
  { label: "Dashboard", href: "/odv/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/odv/analytics", icon: BarChart3 },
];

export function Sidebar({ title, items, showCryptoLock }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  const navContent = (
    <>
      {/* Brand area */}
      <div className="px-4 py-5">
        <p className="font-heading text-lg font-semibold tracking-tight">
          {title}
        </p>
        {user && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {user.email}
          </p>
        )}
      </div>

      {/* Crypto lock toggle */}
      {showCryptoLock && <CryptoLock />}

      {/* Navigation */}
      <nav aria-label="Navigazione principale" className="flex-1 px-2">
        <ul className="flex flex-col gap-0.5">
          {items.filter((item) => {
            if (!user) return true;
            if (item.hideForRoles && item.hideForRoles.includes(user.role.toUpperCase())) return false;
            const privileged = ["RPG", "ADMIN", "SUPER_ADMIN"].includes(user.role.toUpperCase());
            if (item.requirePermission && !privileged) {
              if (item.requirePermission === "canEditSurveys" && !user.canEditSurveys) return false;
              if (item.requirePermission === "canEditThemes" && !user.canEditThemes) return false;
            }
            if (item.requireDataLevel && !privileged) {
              if (user.dataLevel == null) return false;
            }
            return true;
          }).map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-sidebar-accent font-semibold text-sidebar-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Separator + Logout */}
      <div className="border-t border-sidebar-border px-2 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Esci
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-sidebar-border bg-sidebar px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          onClick={() => setOpen(true)}
          aria-label="Apri menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="ml-2 font-heading text-sm font-semibold">{title}</span>
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigazione"
      >
        <div className="flex justify-end px-2 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setOpen(false)}
            aria-label="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex"
        aria-label="Navigazione"
      >
        {navContent}
      </aside>
    </>
  );
}
