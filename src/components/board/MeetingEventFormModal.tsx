"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { ChevronLeft } from "lucide-react";
import type { MeetingOrEvent } from "@/lib/board-types";

type Props = {
  type: "meeting" | "event";
  onClose: () => void;
  onSubmit: (item: Omit<MeetingOrEvent, "id" | "createdAt">) => void;
};

export function MeetingEventFormModal({ type, onClose, onSubmit }: Props) {
  const { locale } = useLocale();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [guestsText, setGuestsText] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const guests = guestsText
    .split(/[\n,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const handleGenerateLink = () => {
    const slug = encodeURIComponent(title.slice(0, 40) || type) + "-" + Date.now();
    setGeneratedLink(typeof window !== "undefined" ? `${window.location.origin}/join/${slug}` : "");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      type,
      title: title.trim(),
      startAt: Date.now() + 24 * 60 * 60 * 1000,
      guests: guests.map((email) => ({ email, rsvp: "pending" as const })),
      showFullGuestList: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-sm shadow-soft-md max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <button type="button" onClick={onClose} className="p-2 rounded-sm text-gray-600 hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {type === "meeting" ? t(locale, "board.addMeeting") : t(locale, "board.addEvent")}
          </h2>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "meeting" ? "Meeting title" : "Event title"}
              className="w-full rounded-sm border border-gray-200 bg-gray-100 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Content / Description</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Agenda, notes, description…"
              rows={3}
              className="w-full rounded-sm border border-gray-200 bg-gray-100 px-4 py-3 text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Guests (email, comma or newline)</label>
            <textarea
              value={guestsText}
              onChange={(e) => setGuestsText(e.target.value)}
              placeholder="guest@example.com, another@example.com"
              rows={2}
              className="w-full rounded-sm border border-gray-200 bg-gray-100 px-4 py-3 text-sm resize-none"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleGenerateLink}
              className="rounded-sm px-4 py-2 text-sm font-medium bg-accent-muted text-accent hover:bg-accent/20 border border-accent/30"
            >
              Generate invite link
            </button>
            {generatedLink && (
              <p className="mt-2 text-xs text-gray-600 break-all rounded-sm bg-gray-50 p-2 border border-gray-200">{generatedLink}</p>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="w-full py-3 rounded-sm text-sm font-medium bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft disabled:opacity-50 border border-[#006666]"
          >
            Create {type === "meeting" ? "Meeting" : "Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
