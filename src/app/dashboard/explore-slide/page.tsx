"use client";

import { ExplorePresentationSlide } from "@/components/dashboard/ExplorePresentationSlide";

/**
 * Investor pitch: Explore Module presentation slide.
 * Full-screen, centered mobile shell — "Future of Fintech" demo.
 */
export default function ExploreSlidePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#f1f5f9]">
      <ExplorePresentationSlide />
    </div>
  );
}
