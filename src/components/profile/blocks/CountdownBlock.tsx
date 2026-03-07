"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

const TEAL = "#008080";

type Props = {
  targetDate: string;
  label?: string;
};

function pad(n: number) {
  return n < 10 ? "0" + n : String(n);
}

export function CountdownBlock({ targetDate, label }: Props) {
  const [diff, setDiff] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    if (Number.isNaN(target)) {
      setDiff({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const tick = () => {
      const now = Date.now();
      const d = Math.max(0, target - now);
      if (d <= 0) {
        setEnded(true);
        setDiff({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setDiff({
        days: Math.floor(d / 86400000),
        hours: Math.floor((d % 86400000) / 3600000),
        minutes: Math.floor((d % 3600000) / 60000),
        seconds: Math.floor((d % 60000) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (diff === null) return null;

  if (ended) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#008080]" /> Countdown
        </h2>
        <p className="text-gray-600 text-sm">The countdown has ended.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#008080]" /> {label || "Countdown"}
      </h2>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <div className="flex flex-col items-center min-w-[4rem]">
          <span className="text-2xl font-bold text-[#008080] tabular-nums">{pad(diff.days)}</span>
          <span className="text-xs text-gray-500">Days</span>
        </div>
        <div className="flex flex-col items-center min-w-[4rem]">
          <span className="text-2xl font-bold text-[#008080] tabular-nums">{pad(diff.hours)}</span>
          <span className="text-xs text-gray-500">Hours</span>
        </div>
        <div className="flex flex-col items-center min-w-[4rem]">
          <span className="text-2xl font-bold text-[#008080] tabular-nums">{pad(diff.minutes)}</span>
          <span className="text-xs text-gray-500">Min</span>
        </div>
        <div className="flex flex-col items-center min-w-[4rem]">
          <span className="text-2xl font-bold text-[#008080] tabular-nums">{pad(diff.seconds)}</span>
          <span className="text-xs text-gray-500">Sec</span>
        </div>
      </div>
    </section>
  );
}
