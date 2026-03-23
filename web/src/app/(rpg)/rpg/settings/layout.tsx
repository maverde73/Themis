"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Users,
  Shield,
  QrCode,
} from "lucide-react";

const settingsTabs = [
  { label: "Generale", href: "/rpg/settings", icon: Building2, exact: true },
  { label: "Team", href: "/rpg/settings/team", icon: Users },
  { label: "Ruoli", href: "/rpg/settings/roles", icon: Shield },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      {/* Tab bar */}
      <nav className="mb-6 flex gap-1 border-b border-border" aria-label="Sezioni impostazioni">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors
                ${active
                  ? "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:rounded-full"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
