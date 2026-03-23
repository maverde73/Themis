"use client";

import { Sidebar, odvNavItems } from "@/components/sidebar";

export default function OdvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar title="OdV Dashboard" items={odvNavItems} />
      <main className="flex-1 overflow-x-hidden overflow-y-auto max-h-screen p-6 md:p-8">{children}</main>
    </div>
  );
}
