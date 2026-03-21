"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth, getStoredUser } from "@/lib/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SidebarProps {
  title: string;
  items: NavItem[];
}

export const rpgNavItems: NavItem[] = [
  { label: "Dashboard", href: "/rpg/dashboard", icon: LayoutDashboard },
  { label: "Moduli", href: "/rpg/surveys", icon: ClipboardList },
  { label: "Temi", href: "/rpg/surveys/themes", icon: Palette },
  { label: "Analytics", href: "/rpg/analytics", icon: BarChart3 },
  { label: "Impostazioni", href: "/rpg/settings", icon: Settings },
];

export const odvNavItems: NavItem[] = [
  { label: "Dashboard", href: "/odv/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/odv/analytics", icon: BarChart3 },
];

export function Sidebar({ title, items }: SidebarProps) {
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

      {/* Navigation */}
      <nav aria-label="Navigazione principale" className="flex-1 px-2">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
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
