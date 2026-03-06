"use client";

import type { ProfileBlock, RichVideoBlockConfig } from "@/lib/profile-builder-types";

function embedUrl(type: string, url: string): string | null {
  if (type === "youtube") {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }
  if (type === "vimeo") {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }
  return null;
}

export function RichVideoBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as RichVideoBlockConfig;
  const { type, url, uploadUrl, title, description } = config.rich_video ?? { type: "youtube", url: "" };
  const src = type === "upload" && uploadUrl ? uploadUrl : embedUrl(type, url);
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="aspect-video bg-black">
        {src ? (
          type === "upload" ? (
            <video src={src} controls className="w-full h-full" />
          ) : (
            <iframe src={src} title={title || "Video"} className="w-full h-full" allowFullScreen />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Add video URL</div>
        )}
      </div>
      <div className="p-4">
        {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
        {description && <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{description}</p>}
      </div>
    </section>
  );
}
