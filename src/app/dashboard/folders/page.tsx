"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Folders page: direct route that opens the dashboard Board (Folders) view.
 * Click Files button -> navigate here -> show Folders. No slides or transitions.
 */
export default function DashboardFoldersPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard?open=board&tab=folders");
  }, [router]);
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background items-center justify-center">
      <p className="text-sm text-gray-500">Loading Folders…</p>
    </div>
  );
}
