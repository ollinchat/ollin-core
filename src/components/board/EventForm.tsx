"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Globe, Upload, Image as ImageIcon, X } from "lucide-react";

export type Contact = { id: string; name: string; email: string };

export type EventFormData = {
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  guestIds: string[];
  imageDataUrl?: string;
  isOnline: boolean;
};

type Props = {
  locale: "en" | "he";
  contacts: Contact[];
  onSubmit: (data: EventFormData) => void;
  submitLabel?: string;
  /** Optional: render inside a card (false for modal) */
  compact?: boolean;
};

export function EventForm({ locale, contacts, onSubmit, submitLabel, compact = false }: Props) {
  const isHe = locale === "he";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState("");
  const [eventMode, setEventMode] = useState<"location" | "online">("location");
  const [location, setLocation] = useState("");
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const guestInputRef = useRef<HTMLInputElement>(null);
  const guestDropdownRef = useRef<HTMLDivElement>(null);

  const filteredContacts = guestSearch.trim()
    ? contacts.filter(
        (c) =>
          !selectedGuestIds.includes(c.id) &&
          (c.name?.toLowerCase().includes(guestSearch.toLowerCase()) ||
            c.email?.toLowerCase().includes(guestSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        guestDropdownRef.current &&
        !guestDropdownRef.current.contains(e.target as Node) &&
        guestInputRef.current &&
        !guestInputRef.current.contains(e.target as Node)
      ) {
        setGuestDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => setImageDataUrl(r.result as string);
      r.readAsDataURL(f);
    }
    e.target.value = "";
  };

  const addGuest = (id: string) => {
    if (!selectedGuestIds.includes(id)) setSelectedGuestIds((prev) => [...prev, id]);
    setGuestSearch("");
    setGuestDropdownOpen(false);
  };

  const removeGuest = (id: string) => {
    setSelectedGuestIds((prev) => prev.filter((x) => x !== id));
  };

  const selectedContacts = selectedGuestIds
    .map((id) => contacts.find((c) => c.id === id))
    .filter(Boolean) as Contact[];

  const handleSubmit = () => {
    onSubmit({
      title,
      description,
      date,
      endDate: endDate || undefined,
      location: eventMode === "online" ? "" : location,
      guestIds: selectedGuestIds,
      imageDataUrl: imageDataUrl ?? undefined,
      isOnline: eventMode === "online",
    });
  };

  const blockClass = compact ? "space-y-3" : "space-y-4";
  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] outline-none";
  const labelClass = "text-xs font-medium text-gray-700 block mb-1";

  return (
    <div className={compact ? "space-y-3" : "rounded-2xl bg-white border border-[#008080]/20 shadow-sm p-5 w-full max-w-md space-y-4"}>
      {!compact && <p className="text-xs font-semibold text-[#008080] uppercase tracking-wider">Event</p>}

      {/* Image Upload */}
      <div>
        <label className={`${labelClass} flex items-center gap-1`}>
          <ImageIcon className="w-3.5 h-3.5 text-[#008080]" />
          {isHe ? "תמונה" : "Image"}
        </label>
        <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#008080]/30 bg-[#008080]/5 p-4 cursor-pointer hover:border-[#008080]/50 hover:bg-[#008080]/10 transition-colors">
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          {imageDataUrl ? (
            <img src={imageDataUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <Upload className="w-6 h-6 text-[#008080]/70" />
          )}
          <span className="text-sm text-gray-600">
            {imageDataUrl ? (isHe ? "החלף" : "Replace") : (isHe ? "העלה תמונה" : "Upload image")}
          </span>
        </label>
      </div>

      {/* Title */}
      <div>
        <label className={labelClass}>{isHe ? "כותרת" : "Title"}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isHe ? "שם האירוע" : "Event title"}
          className={inputClass}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>{isHe ? "תיאור" : "Description"}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isHe ? "תיאור" : "Description"}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Date & time */}
      <div>
        <label className={labelClass}>{isHe ? "תאריך ושעה" : "Date & time"}</label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{isHe ? "סיום (אופציונלי)" : "End time (optional)"}</label>
        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Location / Online toggle */}
      <div>
        <label className={`${labelClass} mb-2`}>{isHe ? "סוג אירוע" : "Event type"}</label>
        <div className="flex rounded-xl border border-[#008080]/20 bg-[#008080]/5 p-1 gap-1">
          <button
            type="button"
            onClick={() => setEventMode("location")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              eventMode === "location" ? "bg-[#008080] text-white shadow-sm" : "text-gray-600 hover:bg-white/80"
            }`}
          >
            <MapPin className="w-4 h-4" />
            {isHe ? "מיקום" : "Location"}
          </button>
          <button
            type="button"
            onClick={() => setEventMode("online")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              eventMode === "online" ? "bg-[#008080] text-white shadow-sm" : "text-gray-600 hover:bg-white/80"
            }`}
          >
            <Globe className="w-4 h-4" />
            {isHe ? "אונליין" : "Online"}
          </button>
        </div>
      </div>

      {eventMode === "location" && (
        <div>
          <label className={`${labelClass} flex items-center gap-1`}>
            <MapPin className="w-3.5 h-3.5 text-[#008080]" />
            {isHe ? "מיקום (כתובת או קישור למפה)" : "Location (address or map link)"}
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={isHe ? "חפש כתובת…" : "Search address…"}
            className={inputClass}
          />
        </div>
      )}

      {/* Guests: searchable dropdown */}
      <div className="relative" ref={guestDropdownRef}>
        <label className={labelClass}>{isHe ? "אורחים (מאנשי הקשר)" : "Guests (from Contacts)"}</label>
        <input
          ref={guestInputRef}
          type="text"
          value={guestSearch}
          onChange={(e) => {
            setGuestSearch(e.target.value);
            setGuestDropdownOpen(true);
          }}
          onFocus={() => setGuestDropdownOpen(true)}
          placeholder={isHe ? "חפש שם או אימייל…" : "Search name or email…"}
          className={inputClass}
        />
        {guestDropdownOpen && filteredContacts.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg py-1 max-h-48 overflow-y-auto">
            {filteredContacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addGuest(c.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-[#008080]/10 transition-colors"
              >
                <span className="font-medium truncate">{c.name || c.email}</span>
                {c.email && c.name && <span className="text-xs text-gray-500 truncate">{c.email}</span>}
              </button>
            ))}
          </div>
        )}
        {selectedContacts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedContacts.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#008080]/15 text-[#006666] px-2.5 py-1 text-xs font-medium"
              >
                {c.name || c.email}
                <button type="button" onClick={() => removeGuest(c.id)} className="p-0.5 rounded-full hover:bg-[#008080]/30" aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {contacts.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">{isHe ? "אין אנשי קשר" : "No contacts"}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full rounded-xl px-4 py-2.5 text-sm font-medium bg-[#008080] text-white hover:bg-[#006666] transition-colors shadow-sm"
      >
        {submitLabel ?? (isHe ? "צור אירוע" : "Create event")}
      </button>
    </div>
  );
}
