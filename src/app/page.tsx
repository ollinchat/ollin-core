"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const ONBOARDED_KEY = "ollin_onboarded";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const onboarded = typeof window !== "undefined" && sessionStorage.getItem(ONBOARDED_KEY);
      if (onboarded) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding");
      }
    } catch {
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <Image src="/logo.png" alt="OllinChat" width={160} height={44} className="h-11 w-auto object-contain animate-pulse opacity-90" priority />
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  );
}
