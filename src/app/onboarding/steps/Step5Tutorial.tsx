"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { MessageSquare, UserCircle, Sparkles } from "lucide-react";

const slides = [
  { key: "slide1", Icon: MessageSquare, titleKey: "onboarding.tutorial.slide1.title" as const, descKey: "onboarding.tutorial.slide1.desc" as const },
  { key: "slide2", Icon: UserCircle, titleKey: "onboarding.tutorial.slide2.title" as const, descKey: "onboarding.tutorial.slide2.desc" as const },
  { key: "slide3", Icon: Sparkles, titleKey: "onboarding.tutorial.slide3.title" as const, descKey: "onboarding.tutorial.slide3.desc" as const },
];

export function Step5Tutorial({ onComplete }: { onComplete: () => void }) {
  const { locale } = useLocale();
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;
  const slide = slides[index];

  return (
    <div className="space-y-8">
      <div className="min-h-[200px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-muted flex items-center justify-center mx-auto mb-4">
              <slide.Icon className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t(locale, slide.titleKey)}
            </h2>
            <p className="text-gray-600 text-sm max-w-[260px] mx-auto">
              {t(locale, slide.descKey)}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-accent" : "w-2 bg-gray-300"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
      <Button
        fullWidth
        onClick={isLast ? onComplete : () => setIndex((i) => i + 1)}
      >
        {isLast ? t(locale, "onboarding.tutorial.getStarted") : t(locale, "onboarding.tutorial.next")}
      </Button>
    </div>
  );
}
