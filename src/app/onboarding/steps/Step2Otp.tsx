"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { ShieldCheck } from "lucide-react";

/** Default OTP for testing: enter 123456 or use pre-filled value */
const DEFAULT_OTP = "123456";

export function Step2Otp({
  phone,
  onVerify,
}: {
  phone: string;
  onVerify: (code: string) => void;
}) {
  const { locale } = useLocale();
  const [code, setCode] = useState(DEFAULT_OTP.split(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const next = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) next[index + i] = d;
      });
      setCode(next);
      const focusIndex = Math.min(index + digits.length, 5);
      inputsRef.current[focusIndex]?.focus();
      if (next.every((c) => c !== "")) onVerify(next.join(""));
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
    if (next.every((c) => c !== "")) onVerify(next.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...code];
    pasted.split("").forEach((d, i) => {
      if (i < 6) next[i] = d;
    });
    setCode(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    if (next.every((c) => c !== "")) onVerify(next.join(""));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-accent" />
        </div>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 text-center">
        {t(locale, "onboarding.otp.title")}
      </h1>
      <p className="text-gray-600 text-center text-sm">
        {t(locale, "onboarding.otp.subtitle")} {phone}
      </p>
      <div
        className="flex gap-2 justify-center"
        onPaste={handlePaste}
      >
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-12 rounded-xl border border-gray-200 text-center text-lg font-semibold focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
            dir="ltr"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      <Button
        fullWidth
        onClick={() => onVerify(code.join(""))}
        disabled={code.some((c) => !c)}
      >
        {t(locale, "onboarding.otp.verify")}
      </Button>
      <Button
        fullWidth
        variant="secondary"
        onClick={() => {}}
      >
        {t(locale, "onboarding.otp.resend")}
      </Button>
    </div>
  );
}
