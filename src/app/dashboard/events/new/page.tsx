"use client";

import { useState } from "react";
import Link from "next/link";
import { useBoard } from "@/contexts/BoardContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useLocale } from "@/contexts/LocaleContext";
import { ChevronLeft, Calendar } from "lucide-react";
import { EventForm, type EventFormData } from "@/components/board/EventForm";

export default function NewEventPage() {
  const { locale } = useLocale();
  const { addEvent } = useBoard();
  const { contacts } = useContacts();
  const [saved, setSaved] = useState(false);

  const handleSubmit = (data: EventFormData) => {
    if (!data.title.trim()) return;
    const startAt = new Date(data.date).getTime() || Date.now() + 24 * 60 * 60 * 1000;
    const endAt = data.endDate ? new Date(data.endDate).getTime() : undefined;
    const guests = data.guestIds
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({ email: c!.email, name: c!.name, rsvp: "pending" as const }));
    addEvent({
      type: "event",
      title: data.title.trim(),
      startAt,
      endAt,
      location: data.isOnline ? "Online" : (data.location.trim() || undefined),
      description: data.description.trim() || undefined,
      imageUrl: data.imageDataUrl,
      guests,
      showFullGuestList: true,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[#008080]/10 bg-white/95">
        <Link
          href="/dashboard"
          className="p-2 rounded-2xl text-gray-600 hover:bg-[#008080]/10 hover:text-[#006666] flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          {locale === "he" ? "חזרה" : "Back"}
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#008080]" />
          {locale === "he" ? "אירוע חדש" : "New event"}
        </h1>
      </header>

      <div className="flex-1 p-4 flex justify-center">
        <EventForm
          locale={locale}
          contacts={contacts}
          onSubmit={handleSubmit}
          submitLabel={saved ? (locale === "he" ? "נשמר!" : "Saved!") : undefined}
        />
      </div>
    </div>
  );
}
