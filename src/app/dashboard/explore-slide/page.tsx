"use client";

import { ExplorePresentationSlide } from "@/components/dashboard/ExplorePresentationSlide";

/**
 * Investor pitch: Explore Module presentation slide.
 * Full-screen, centered mobile shell — "Future of Fintech" demo.
 * Bilingual (EN/עב) and RTL/LTR are driven by the slide's useLocale().
 */
export default function ExploreSlidePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10 bg-[#f1f5f9]">
      <ExplorePresentationSlide />
    </div>
  );
}
