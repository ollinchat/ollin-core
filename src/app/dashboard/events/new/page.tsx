"use client";

import { useState } from "react";
import Link from "next/link";
import { useBoard } from "@/contexts/BoardContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useLocale } from "@/contexts/LocaleContext";
import { ChevronLeft, Calendar, MapPin, Users } from "lucide-react";

export default function NewEventPage() {
  const { locale } = useLocale();
  const { addEvent } = useBoard();
  const { contacts } = useContacts();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const startAt = date && time ? new Date(`${date}T${time}`).getTime() : Date.now() + 24 * 60 * 60 * 1000;
    const endAt = date && endTime ? new Date(`${date}T${endTime}`).getTime() : undefined;
    const guests = Array.from(selectedContactIds)
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({ email: c!.email, name: c!.name, rsvp: "pending" as const }));
    addEvent({
      type: "event",
      title: title.trim(),
      startAt,
      endAt,
      location: location.trim() || undefined,
      guests,
      showFullGuestList: true,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleGuest = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mapUrl = location.trim()
    ? `https://www.google.com/maps?q=${encodeURIComponent(location)}`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/95">
        <Link href="/dashboard" className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          {locale === "he" ? "חזרה" : "Back"}
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" />
          {locale === "he" ? "אירוע חדש" : "New event"}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-6 max-w-lg mx-auto w-full">
        <div className="rounded-2xl bg-white shadow-soft p-4 border-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "he" ? "כותרת" : "Title"}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={locale === "he" ? "שם האירוע" : "Event title"}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            required
          />
        </div>

        <div className="rounded-2xl bg-white shadow-soft p-4 border-0 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "he" ? "תאריך" : "Date"}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "he" ? "שעה" : "Time"}</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{locale === "he" ? "סיום (אופציונלי)" : "End time (optional)"}</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-soft p-4 border-0">
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            {locale === "he" ? "מיקום (כתובת או קישור למפה)" : "Location (address or Google Maps link)"}
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. 123 Main St or paste Google Maps URL"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
          />
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-accent hover:underline"
            >
              {locale === "he" ? "פתח ב-Google Maps" : "Open in Google Maps"}
            </a>
          )}
        </div>

        <div className="rounded-2xl bg-white shadow-soft p-4 border-0">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            {locale === "he" ? "אורחים (מאנשי הקשר)" : "Guests (from Contacts)"}
          </label>
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-500">{locale === "he" ? "אין אנשי קשר. הוסף ברשת הפנימית." : "No contacts. Add some in Internal Chat."}</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {contacts.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 cursor-pointer rounded-xl p-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(c.id)}
                      onChange={() => toggleGuest(c.id)}
                      className="rounded border-gray-300 text-accent"
                    />
                    <span className="font-medium text-gray-900">{c.name}</span>
                    <span className="text-xs text-gray-500">{c.email}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-2xl bg-accent text-white font-medium shadow-soft hover:shadow-glow-subtle"
        >
          {saved ? (locale === "he" ? "נשמר!" : "Saved!") : (locale === "he" ? "צור אירוע" : "Create event")}
        </button>
      </form>
    </div>
  );
}
