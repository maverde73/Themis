"use client";

import { Sidebar, rpgNavItems } from "@/components/sidebar";

export default function RpgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar title="RPG Dashboard" items={rpgNavItems} />
      <main className="flex-1 overflow-x-hidden overflow-y-auto max-h-screen">{children}</main>
    </div>
  );
}
