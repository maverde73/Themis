"use client";

import { Sidebar, rpgNavItems } from "@/components/sidebar";
import { CryptoProvider } from "@/lib/crypto/crypto-context";

export default function RpgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CryptoProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar title="RPG Dashboard" items={rpgNavItems} showCryptoLock />
        <main className="flex-1 overflow-x-hidden overflow-y-auto max-h-screen p-6 md:p-8">{children}</main>
      </div>
    </CryptoProvider>
  );
}
