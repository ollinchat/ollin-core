"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { ChevronLeft } from "lucide-react";
import type { MeetingOrEvent } from "@/lib/board-types";
import type { Contact } from "@/contexts/ContactsContext";
import { EventForm, type EventFormData } from "./EventForm";

type Props = {
  type: "meeting" | "event";
  contacts: Contact[];
  onClose: () => void;
  onSubmit: (item: Omit<MeetingOrEvent, "id" | "createdAt">) => void;
};

function mapFormDataToItem(
  data: EventFormData,
  type: "meeting" | "event",
  contacts: Contact[]
): Omit<MeetingOrEvent, "id" | "createdAt"> {
  const startAt = new Date(data.date).getTime() || Date.now() + 24 * 60 * 60 * 1000;
  const endAt = data.endDate ? new Date(data.endDate).getTime() : undefined;
  const guests = data.guestIds
    .map((id) => contacts.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({ email: c!.email, name: c!.name, rsvp: "pending" as const }));
  return {
    type,
    title: data.title.trim(),
    startAt,
    endAt,
    description: data.description.trim() || undefined,
    location: data.isOnline ? "Online" : (data.location.trim() || undefined),
    imageUrl: data.imageDataUrl,
    guests,
    showFullGuestList: true,
  };
}

export function MeetingEventFormModal({ type, contacts, onClose, onSubmit }: Props) {
  const { locale } = useLocale();
  const [generatedLink, setGeneratedLink] = useState("");

  const handleSubmit = (data: EventFormData) => {
    if (!data.title.trim()) return;
    onSubmit(mapFormDataToItem(data, type, contacts));
    onClose();
  };

  const handleGenerateLink = () => {
    setGeneratedLink(
      typeof window !== "undefined"
        ? `${window.location.origin}/join/${encodeURIComponent(type)}-${Date.now()}`
        : ""
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-lg max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col border border-[#008080]/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-[#008080]/10">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-600 hover:bg-[#008080]/10 hover:text-[#006666]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {type === "meeting" ? t(locale, "board.addMeeting") : t(locale, "board.addEvent")}
          </h2>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <EventForm
            locale={locale}
            contacts={contacts}
            onSubmit={handleSubmit}
            submitLabel={type === "meeting" ? (locale === "he" ? "צור פגישה" : "Create Meeting") : (locale === "he" ? "צור אירוע" : "Create Event")}
            compact
          />
          {type === "meeting" && (
            <div className="mt-4 pt-4 border-t border-[#008080]/10">
              <button
                type="button"
                onClick={handleGenerateLink}
                className="rounded-xl px-4 py-2 text-sm font-medium bg-[#008080]/10 text-[#008080] hover:bg-[#008080]/20 border border-[#008080]/30"
              >
                {locale === "he" ? "צור קישור הזמנה" : "Generate invite link"}
              </button>
              {generatedLink && (
                <p className="mt-2 text-xs text-gray-600 break-all rounded-xl bg-[#008080]/5 p-2 border border-[#008080]/20">
                  {generatedLink}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
