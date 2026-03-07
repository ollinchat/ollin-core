"use client";

import { useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import type { TestimonialItem } from "@/lib/profile-types";

const TEAL = "#008080";

type Props = {
  items: TestimonialItem[];
};

export function TestimonialsBlock({ items }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!items.length) return null;

  const scrollTo = (i: number) => {
    const next = Math.max(0, Math.min(i, items.length - 1));
    setIndex(next);
    scrollRef.current?.children[next]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Star className="w-4 h-4 text-[#008080]" /> Testimonials
      </h2>
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 scroll-smooth scrollbar-hide -mx-1"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {items.map((t, i) => (
            <div
              key={t.id}
              className="flex-shrink-0 w-[85vw] max-w-sm snap-center rounded-xl border border-gray-100 bg-gray-50/50 p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                {t.avatar ? (
                  <img src={t.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#008080]/20 flex items-center justify-center text-[#008080] font-semibold text-lg">
                    {t.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <span className="flex text-amber-500 text-sm" aria-label={`${t.stars} stars`}>
                    {Array.from({ length: 5 }).map((_, j) => (j < t.stars ? "★" : "☆"))}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm">{t.text}</p>
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => scrollTo(index - 1)}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-[#008080]" : "bg-gray-300"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
            <button
              type="button"
              onClick={() => scrollTo(index + 1)}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
