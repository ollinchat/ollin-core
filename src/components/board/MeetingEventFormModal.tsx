"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { ChevronLeft, MapPin, Globe, X } from "lucide-react";
import type { MeetingOrEvent } from "@/lib/board-types";
import type { Contact } from "@/contexts/ContactsContext";

type Props = {
  type: "meeting" | "event";
  contacts: Contact[];
  onClose: () => void;
  onSubmit: (item: Omit<MeetingOrEvent, "id" | "createdAt">) => void;
};

export function MeetingEventFormModal({ type, contacts, onClose, onSubmit }: Props) {
  const { locale } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState("");
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [selectedGuests, setSelectedGuests] = useState<Contact[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredContacts = guestSearchQuery.trim()
    ? contacts.filter(
        (c) =>
          c.name?.toLowerCase().includes(guestSearchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(guestSearchQuery.toLowerCase())
      )
    : [];
  const alreadySelectedIds = new Set(selectedGuests.map((g) => g.id));
  const toShow = filteredContacts.filter((c) => !alreadySelectedIds.has(c.id));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleGenerateLink = () => {
    const slug = encodeURIComponent(title.slice(0, 40) || type) + "-" + Date.now();
    setGeneratedLink(typeof window !== "undefined" ? `${window.location.origin}/join/${slug}` : "");
  };

  const addGuest = (contact: Contact) => {
    if (alreadySelectedIds.has(contact.id)) return;
    setSelectedGuests((prev) => [...prev, contact]);
    setGuestSearchQuery("");
    setDropdownOpen(false);
  };

  const removeGuest = (contactId: string) => {
    setSelectedGuests((prev) => prev.filter((g) => g.id !== contactId));
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      type,
      title: title.trim(),
      startAt: Date.now() + 24 * 60 * 60 * 1000,
      description: description.trim() || undefined,
      location: isOnline ? "Online" : location.trim() || undefined,
      imageUrl: imageUrl || undefined,
      guests: selectedGuests.map((g) => ({ email: g.email, name: g.name, rsvp: "pending" as const })),
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
            <label className="text-sm font-medium text-gray-700 block mb-1">Image</label>
            <div className="flex items-center gap-3">
              <label className="rounded-sm border border-gray-200 bg-gray-100 px-4 py-2 text-sm cursor-pointer hover:bg-gray-200">
                Choose image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {imageUrl && (
                <div className="relative inline-block">
                  <img src={imageUrl} alt="" className="h-14 w-14 object-cover rounded-sm border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Location</label>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setIsOnline(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-sm font-medium border ${
                  isOnline ? "bg-accent/10 border-accent text-accent" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Globe className="w-4 h-4" />
                Online
              </button>
              <button
                type="button"
                onClick={() => setIsOnline(false)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-sm font-medium border ${
                  !isOnline ? "bg-accent/10 border-accent text-accent" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MapPin className="w-4 h-4" />
                Location
              </button>
            </div>
            {!isOnline && (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Address or place"
                className="w-full rounded-sm border border-gray-200 bg-gray-100 px-4 py-3 text-sm"
              />
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda, notes, description…"
              rows={3}
              className="w-full rounded-sm border border-gray-200 bg-gray-100 px-4 py-3 text-sm resize-none"
            />
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="text-sm font-medium text-gray-700 block mb-1">Guests</label>
            <input
              type="text"
              value={guestSearchQuery}
              onChange={(e) => {
                setGuestSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Search contacts to add…"
              className="w-full rounded-sm border border-gray-200 bg-gray-100 px-4 py-3 text-sm"
            />
            {dropdownOpen && guestSearchQuery.trim() && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-sm border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {toShow.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">
                    {locale === "he" ? "אין תוצאות" : "No matching contacts"}
                  </p>
                ) : (
                  toShow.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addGuest(c)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      {c.avatar ? (
                        <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">
                          {(c.name || c.email)[0].toUpperCase()}
                        </span>
                      )}
                      <span className="truncate">{c.name || c.email}</span>
                      {c.email && c.name && <span className="text-gray-400 text-xs truncate">{c.email}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedGuests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedGuests.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-xs"
                  >
                    {g.name || g.email}
                    <button
                      type="button"
                      onClick={() => removeGuest(g.id)}
                      className="p-0.5 rounded-full hover:bg-gray-200"
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              <p className="mt-2 text-xs text-gray-600 break-all rounded-sm bg-gray-50 p-2 border border-gray-200">
                {generatedLink}
              </p>
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
