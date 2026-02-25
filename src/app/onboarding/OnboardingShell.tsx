"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 80 : -80, opacity: 0 }),
};

export function OnboardingShell({
  step,
  children,
  dir = 1,
}: {
  step: number;
  children: React.ReactNode;
  dir?: number;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background safe-area-padding">
      <header className="flex-shrink-0 flex justify-center pt-6 pb-2">
        <Image src="/logo.png" alt="OllinChat" width={140} height={38} className="h-9 w-auto object-contain" priority />
      </header>
      <main className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
