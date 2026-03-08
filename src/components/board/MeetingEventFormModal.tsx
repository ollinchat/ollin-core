"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Upload,
  Image as ImageIcon,
  UserPlus,
  Link2,
  Copy,
  Phone,
  X,
} from "lucide-react";
import type { MeetingOrEvent } from "@/lib/board-types";
import type { Contact } from "@/contexts/ContactsContext";
import { EventForm, type EventFormData } from "./EventForm";

const TEAL = "#008080";
const DURATIONS = [
  { value: 25, label: "25 min" },
  { value: 35, label: "35 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
];

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

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

function generateMeetingLink(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/join/meeting-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function MeetingForm({
  locale,
  contacts,
  meetingLink,
  onCopyLink,
  onSubmit,
  onCancel,
}: {
  locale: "en" | "he";
  contacts: Contact[];
  meetingLink: string;
  onCopyLink: () => void;
  onSubmit: (item: Omit<MeetingOrEvent, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const isHe = locale === "he";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const today = new Date();
  const defaultDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const [date, setDate] = useState(defaultDate.toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [meetingType, setMeetingType] = useState<"online" | "inPerson">("online");
  const [address, setAddress] = useState("");
  const [autoCall, setAutoCall] = useState(false);
  const [guestIds, setGuestIds] = useState<string[]>([]);
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [externalEmailInput, setExternalEmailInput] = useState("");
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const guestInputRef = useRef<HTMLInputElement>(null);
  const guestDropdownRef = useRef<HTMLDivElement>(null);

  const selectedDate = new Date(date + "T12:00:00");
  const dayOfWeek = selectedDate.getDay();
  const dayName = isHe ? DAY_NAMES_HE[dayOfWeek] : DAY_NAMES_EN[dayOfWeek];

  const filteredContacts = guestSearch.trim()
    ? contacts.filter(
        (c) =>
          !guestIds.includes(c.id) &&
          (c.name?.toLowerCase().includes(guestSearch.toLowerCase()) ||
            c.email?.toLowerCase().includes(guestSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        guestDropdownRef.current && !guestDropdownRef.current.contains(e.target as Node) &&
        guestInputRef.current && !guestInputRef.current.contains(e.target as Node)
      )
        setGuestDropdownOpen(false);
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
    if (!guestIds.includes(id)) setGuestIds((prev) => [...prev, id]);
    setGuestSearch("");
    setGuestDropdownOpen(false);
  };

  const removeGuest = (id: string) => {
    setGuestIds((prev) => prev.filter((x) => x !== id));
  };

  const addExternalEmail = () => {
    const email = externalEmailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || externalEmails.includes(email)) return;
    setExternalEmails((prev) => [...prev, email]);
    setExternalEmailInput("");
  };

  const removeExternalEmail = (email: string) => {
    setExternalEmails((prev) => prev.filter((e) => e !== email));
  };

  const selectedContacts = guestIds
    .map((id) => contacts.find((c) => c.id === id))
    .filter(Boolean) as Contact[];

  const handleSubmit = () => {
    if (!title.trim()) return;
    const startAt = new Date(`${date}T${time}`).getTime();
    const endAt = startAt + durationMinutes * 60 * 1000;
    const guestsFromContacts = selectedContacts.map((c) => ({ email: c.email, name: c.name, rsvp: "pending" as const }));
    const guestsFromExternal = externalEmails.map((email) => ({ email, name: undefined, rsvp: "pending" as const }));
    const guests = [...guestsFromContacts, ...guestsFromExternal];
    onSubmit({
      type: "meeting",
      title: title.trim(),
      startAt,
      endAt,
      description: description.trim() || undefined,
      location: meetingType === "online" ? "Online" : (address.trim() || undefined),
      imageUrl: imageDataUrl ?? undefined,
      guests,
      showFullGuestList: true,
    });
  };

  const inputClass = "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] outline-none transition-shadow";
  const labelClass = "text-xs font-medium text-gray-600 block mb-2";

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className={labelClass}>{isHe ? "כותרת" : "Title"}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isHe ? "שם הפגישה" : "Meeting title"}
          className={inputClass}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>{isHe ? "תיאור / הערות" : "Description / Notes"}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isHe ? "הערות לפגישה" : "Meeting notes"}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Minimal image upload */}
      <div>
        <label className={`${labelClass} flex items-center gap-1.5`}>
          <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
          {isHe ? "תמונה" : "Image"}
        </label>
        <label className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-2.5 cursor-pointer hover:bg-gray-100/80 hover:border-gray-300 transition-colors">
          <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          {imageDataUrl ? (
            <img src={imageDataUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <Upload className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-xs text-gray-600">{imageDataUrl ? (isHe ? "החלף" : "Replace") : (isHe ? "העלה תמונה" : "Upload Image")}</span>
        </label>
      </div>

      {/* Date & Time + Day highlight */}
      <div className="space-y-3">
        <label className={labelClass}>{isHe ? "תאריך ושעה" : "Date & Time"}</label>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex-1 min-w-[100px]">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-sm font-medium text-[#008080] flex items-center gap-2 rounded-xl bg-[#008080]/10 px-3 py-2 w-fit">
          <Calendar className="w-4 h-4" />
          {dayName}
        </p>
      </div>

      {/* Duration quick-select */}
      <div>
        <label className={`${labelClass} flex items-center gap-1.5`}>
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          {isHe ? "משך" : "Duration"}
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDurationMinutes(d.value)}
              className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                durationMinutes === d.value
                  ? "bg-[#008080] text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meeting type: Online / In-Person */}
      <div>
        <label className={`${labelClass} mb-2`}>{isHe ? "סוג פגישה" : "Meeting Type"}</label>
        <div className="flex rounded-3xl border border-gray-200 bg-gray-50/80 p-1 gap-1">
          <button
            type="button"
            onClick={() => setMeetingType("online")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all ${
              meetingType === "online" ? "bg-white text-[#008080] shadow-sm border border-gray-200" : "text-gray-600 hover:bg-white/60"
            }`}
          >
            <Globe className="w-4 h-4" />
            {isHe ? "אונליין" : "Online"}
          </button>
          <button
            type="button"
            onClick={() => setMeetingType("inPerson")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all ${
              meetingType === "inPerson" ? "bg-white text-[#008080] shadow-sm border border-gray-200" : "text-gray-600 hover:bg-white/60"
            }`}
          >
            <MapPin className="w-4 h-4" />
            {isHe ? "פנים אל פנים" : "In-Person"}
          </button>
        </div>
      </div>

      {meetingType === "inPerson" && (
        <div>
          <label className={`${labelClass} flex items-center gap-1.5`}>
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
            {isHe ? "כתובת" : "Address"}
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={isHe ? "כתובת הפגישה" : "Meeting address"}
            className={inputClass}
          />
        </div>
      )}

      {meetingType === "online" && (
        <label className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 bg-gray-50/80 cursor-pointer hover:bg-gray-100/80 transition-colors">
          <input type="checkbox" checked={autoCall} onChange={(e) => setAutoCall(e.target.checked)} className="rounded border-gray-300 text-[#008080] focus:ring-[#008080]/30" />
          <Phone className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-800">{isHe ? "שיחה אוטומטית (המערכת תתקשר אוטומטית)" : "Auto-Call (system will call automatically)"}</span>
        </label>
      )}

      {/* Add Users + External Emails */}
      <div className="relative" ref={guestDropdownRef}>
        <label className={`${labelClass} flex items-center gap-1.5`}>
          <UserPlus className="w-3.5 h-3.5 text-gray-500" />
          {isHe ? "משתתפים" : "Add Users"}
        </label>
        <input
          ref={guestInputRef}
          type="text"
          value={guestSearch}
          onChange={(e) => { setGuestSearch(e.target.value); setGuestDropdownOpen(true); }}
          onFocus={() => setGuestDropdownOpen(true)}
          placeholder={isHe ? "חפש משתמשים או הזן אימייל חיצוני" : "Search users or add external email"}
          className={inputClass}
        />
        {guestDropdownOpen && filteredContacts.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-xl py-1 max-h-48 overflow-y-auto">
            {filteredContacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addGuest(c.id)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-800 hover:bg-[#008080]/10 transition-colors"
              >
                <span className="font-medium truncate">{c.name || c.email}</span>
                {c.email && c.name && <span className="text-xs text-gray-500 truncate">{c.email}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedContacts.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#008080]/12 text-gray-800 px-3 py-1.5 text-xs font-medium">
              {c.name || c.email}
              <button type="button" onClick={() => removeGuest(c.id)} className="p-0.5 rounded-full hover:bg-[#008080]/20" aria-label="Remove">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {externalEmails.map((email) => (
            <span key={email} className="inline-flex items-center gap-1.5 rounded-full bg-gray-200 text-gray-700 px-3 py-1.5 text-xs font-medium">
              {email}
              <button type="button" onClick={() => removeExternalEmail(email)} className="p-0.5 rounded-full hover:bg-gray-300" aria-label="Remove">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="email"
            value={externalEmailInput}
            onChange={(e) => setExternalEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExternalEmail())}
            placeholder={isHe ? "אימייל חיצוני" : "External email"}
            className="flex-1 rounded-2xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button type="button" onClick={addExternalEmail} className="rounded-2xl px-4 py-2 text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300">
            {isHe ? "הוסף" : "Add"}
          </button>
        </div>
      </div>

      {/* Meeting Link */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 space-y-2">
        <label className={`${labelClass} flex items-center gap-1.5`}>
          <Link2 className="w-3.5 h-3.5 text-gray-500" />
          {isHe ? "קישור לפגישה" : "Meeting Link"}
        </label>
        <div className="flex gap-2">
          <input type="text" readOnly value={meetingLink} className={`${inputClass} flex-1 bg-white text-gray-600 text-xs`} />
          <button
            type="button"
            onClick={onCopyLink}
            className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium bg-[#008080] text-white hover:bg-[#006666] transition-colors shrink-0"
          >
            <Copy className="w-4 h-4" />
            {isHe ? "העתק" : "Copy"}
          </button>
        </div>
      </div>

      {/* Create Meeting button */}
      <div className="pt-2 pb-1">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-3xl py-4 px-6 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-[#008080]/40 focus:ring-offset-2"
          style={{ backgroundColor: TEAL }}
        >
          {isHe ? "צור פגישה" : "Create Meeting"}
        </button>
      </div>
    </div>
  );
}

export function MeetingEventFormModal({ type, contacts, onClose, onSubmit }: Props) {
  const { locale } = useLocale();
  const [meetingLink] = useState(() => generateMeetingLink());
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMeetingSubmit = (item: Omit<MeetingOrEvent, "id" | "createdAt">) => {
    onSubmit(item);
    onClose();
  };

  const handleEventSubmit = (data: EventFormData) => {
    if (!data.title.trim()) return;
    onSubmit(mapFormDataToItem(data, type, contacts));
    onClose();
  };

  const isMeeting = type === "meeting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {isMeeting ? t(locale, "board.addMeeting") : t(locale, "board.addEvent")}
          </h2>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {isMeeting ? (
            <MeetingForm
              locale={locale}
              contacts={contacts}
              meetingLink={meetingLink}
              onCopyLink={handleCopyLink}
              onSubmit={handleMeetingSubmit}
              onCancel={onClose}
            />
          ) : (
            <EventForm
              locale={locale}
              contacts={contacts}
              onSubmit={handleEventSubmit}
              submitLabel={locale === "he" ? "צור אירוע" : "Create Event"}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}
