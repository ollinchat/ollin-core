"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "./OnboardingShell";
import { Step1Phone } from "./steps/Step1Phone";
import { Step2Otp } from "./steps/Step2Otp";
import { Step3BasicInfo, type Step3Payload } from "./steps/Step3BasicInfo";
import { Step4OAuth } from "./steps/Step4OAuth";
import { Step5Tutorial } from "./steps/Step5Tutorial";
import { useProfile } from "@/contexts/ProfileContext";

const ONBOARDED_KEY = "ollin_onboarded";

export default function OnboardingPage() {
  const router = useRouter();
  const { updateProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [phone, setPhone] = useState("");

  const go = useCallback((next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }, [step]);

  const handlePhoneContinue = useCallback((p: string) => {
    setPhone(p);
    go(2);
  }, [go]);

  const handleOtpVerify = useCallback(() => {
    go(3);
  }, [go]);

  const handleBasicInfoContinue = useCallback(
    (payload: Step3Payload) => {
      updateProfile({
        name: payload.displayName,
        username: payload.username,
      });
      go(4);
    },
    [go, updateProfile]
  );

  const handleOAuthSkip = useCallback(() => {
    go(5);
  }, [go]);

  const handleTutorialComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(ONBOARDED_KEY, "1");
      } catch (_) {}
    }
    router.push("/dashboard");
  }, [router]);

  return (
    <OnboardingShell step={step} dir={dir}>
      {step === 1 && <Step1Phone onContinue={handlePhoneContinue} />}
      {step === 2 && (
        <Step2Otp phone={phone} onVerify={handleOtpVerify} />
      )}
      {step === 3 && <Step3BasicInfo onContinue={handleBasicInfoContinue} />}
      {step === 4 && (
        <Step4OAuth
          onGoogle={handleOAuthSkip}
          onEmail={handleOAuthSkip}
          onSkip={handleOAuthSkip}
        />
      )}
      {step === 5 && <Step5Tutorial onComplete={handleTutorialComplete} />}
    </OnboardingShell>
  );
}
