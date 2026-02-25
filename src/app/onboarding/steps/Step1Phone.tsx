"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { Phone } from "lucide-react";

const DEFAULT_COUNTRY = "+972";

export function Step1Phone({ onContinue }: { onContinue: (phone: string) => void }) {
  const { locale } = useLocale();
  const [phone, setPhone] = useState("");
  const fullPhone = phone.startsWith("+") ? phone : `${DEFAULT_COUNTRY}${phone.replace(/^0+/, "")}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = phone.replace(/\D/g, "");
    if (normalized.length >= 8) {
      onContinue(fullPhone);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-center mb-6">
        <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center">
          <Phone className="w-7 h-7 text-accent" />
        </div>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 text-center">
        {t(locale, "onboarding.phone.title")}
      </h1>
      <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-accent focus-within:border-accent">
        <span className="flex items-center px-4 text-gray-500 bg-gray-50 border-r border-gray-200">
          {DEFAULT_COUNTRY}
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder={t(locale, "onboarding.phone.placeholder")}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
          className="flex-1 min-h-[48px] px-4 text-base outline-none"
          dir="ltr"
          aria-label="Phone number"
        />
      </div>
      <Button type="submit" fullWidth disabled={phone.replace(/\D/g, "").length < 8}>
        {t(locale, "onboarding.phone.continue")}
      </Button>
    </form>
  );
}
