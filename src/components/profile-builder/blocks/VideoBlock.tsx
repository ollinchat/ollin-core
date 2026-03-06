"use client";

import type { ProfileBlock, VideoBlockConfig } from "@/lib/profile-builder-types";

function embedUrl(type: string, url: string): string | null {
  if (type === "youtube") {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? "https://www.youtube.com/embed/" + match[1] : null;
  }
  if (type === "vimeo") {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? "https://player.vimeo.com/video/" + match[1] : null;
  }
  return null;
}

export function VideoBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as VideoBlockConfig;
  const v = config.video ?? { type: "youtube", url: "" };
  const src = v.type === "upload" && v.uploadUrl ? v.uploadUrl : embedUrl(v.type, v.url);
  if (!src) return null;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="aspect-video bg-black">
        {v.type === "upload" ? <video src={src} controls className="w-full h-full" /> : <iframe src={src} title="Video" className="w-full h-full" allowFullScreen />}
      </div>
    </section>
  );
}
