"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { User } from "lucide-react";

export type Step3Payload = { displayName: string; username: string };

export function Step3BasicInfo({ onContinue }: { onContinue: (payload: Step3Payload) => void }) {
  const { locale } = useLocale();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = displayName.trim();
    const u = username.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
    if (d.length >= 2 && u.length >= 2) onContinue({ displayName: d, username: u });
  };

  const slug = username.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
  const canSubmit = displayName.trim().length >= 2 && slug.length >= 2;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center">
          <User className="w-7 h-7 text-accent" />
        </div>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 text-center">
        {t(locale, "onboarding.basicInfo.title")}
      </h1>
      <Input
        type="text"
        autoComplete="name"
        placeholder={t(locale, "onboarding.basicInfo.displayNamePlaceholder")}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        aria-label="Display name"
      />
      <Input
        type="text"
        autoComplete="username"
        placeholder={t(locale, "onboarding.basicInfo.usernamePlaceholder")}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        aria-label="Username"
      />
      <Button type="submit" fullWidth disabled={!canSubmit}>
        {t(locale, "onboarding.basicInfo.continue")}
      </Button>
    </form>
  );
}
