"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/auth";
import { AnalyticsView } from "@/components/analytics-view";

export default function OdvAnalyticsPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const user = getStoredUser();
    if (!user?.orgId) {
      router.replace("/login");
      return;
    }
    setOrgId(user.orgId);
  }, [router]);

  if (!orgId) return null;

  return <AnalyticsView orgId={orgId} />;
}
