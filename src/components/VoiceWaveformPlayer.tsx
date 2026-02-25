"use client";

import { useRef, useEffect, useState } from "react";

type Props = { src: string; className?: string };

/** Minimal voice note player with animated waveform during playback. */
export function VoiceWaveformPlayer({ src, className = "" }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const bars = 24;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  };

  return (
    <div className={`flex items-center gap-2 min-w-[160px] ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 hover:bg-white/30 transition-colors"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex-1 flex items-center gap-0.5 h-6">
        {Array.from({ length: bars }).map((_, i) => {
          const p = (i / bars) * 100;
          const active = playing ? p <= progress : false;
          const h = 4 + (i % 3) * 4;
          return (
            <span
              key={i}
              className="w-1 rounded-full bg-current transition-all duration-150"
              style={{
                height: active ? `${h}px` : "4px",
                opacity: active ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
