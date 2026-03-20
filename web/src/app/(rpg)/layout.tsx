"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearAuth } from "@/lib/auth";

export default function RpgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <h1 className="text-base font-semibold tracking-tight">
          RPG Dashboard
        </h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
