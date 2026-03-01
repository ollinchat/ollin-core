"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { useBoard } from "@/contexts/BoardContext";
import { t } from "@/lib/translations";
import type { MeetingOrEvent, RSVPStatus } from "@/lib/board-types";
import { Users, MapPin, Calendar, Check, ChevronDown, ChevronUp, ExternalLink, Trash2, Archive } from "lucide-react";

type MeetingEventCardProps = {
  item: MeetingOrEvent;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Current user ID; only creator can delete */
  currentUserId?: string;
};

function mapUrl(location: string): string {
  const q = encodeURIComponent(location);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function MeetingEventCard({ item, selected, onToggleSelect, currentUserId }: MeetingEventCardProps) {
  const { locale } = useLocale();
  const { setGuestRSVP, removeMeeting, removeEvent, archiveMeeting, archiveEvent } = useBoard();
  const isCreator = currentUserId && item.creatorId === currentUserId;
  const handleDelete = () => {
    if (!isCreator) return;
    if (item.type === "meeting") removeMeeting(item.id);
    else removeEvent(item.id);
  };
  const handleArchive = () => {
    if (!isCreator) return;
    if (item.type === "meeting") archiveMeeting(item.id);
    else archiveEvent(item.id);
  };
  const [expanded, setExpanded] = useState(false);
  const attending = item.guests.filter((g) => g.rsvp === "attending").length;
  const notAttending = item.guests.filter((g) => g.rsvp === "not_attending").length;

  const handleRSVP = (guestEmail: string, rsvp: RSVPStatus) => {
    setGuestRSVP(item.type, item.id, guestEmail, rsvp);
  };

  const hasDetails = Boolean(item.description || (item.location && item.location !== "Online") || item.guests.length > 0);

  return (
    <div
      className={`rounded-sm bg-white overflow-hidden border border-gray-200 shadow-soft ${
        selected ? "ring-2 ring-accent/30 shadow-glow-subtle" : ""
      }`}
    >
      <div className="w-full p-3 flex items-start gap-2 text-left">
        <button
          type="button"
          onClick={() => hasDetails && setExpanded((e) => !e)}
          className="flex-1 min-w-0 flex items-start gap-2 text-left hover:bg-gray-50/50 transition-colors"
        >
        {onToggleSelect != null && (
          <span
            className="mt-0.5 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onToggleSelect}
              className="w-5 h-5 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:border-accent transition-colors"
              aria-label={selected ? "Deselect" : "Select for summary"}
            >
              {selected && <Check className="w-3 h-3 text-accent" />}
            </button>
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900">{item.title}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {new Date(item.startAt).toLocaleString(locale === "he" ? "he-IL" : "en-US", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
          {item.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {item.location}
            </p>
          )}
        </div>
        {hasDetails && (
          <span className="flex-shrink-0 pt-0.5 text-gray-400">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </span>
        )}
        </button>
        {isCreator && (
          <>
            <button
              type="button"
              onClick={handleArchive}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-sm flex-shrink-0"
              title={locale === "he" ? "ארכב" : "Archive"}
              aria-label="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-sm flex-shrink-0"
              title={locale === "he" ? "מחק" : "Delete"}
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 space-y-3">
          {item.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {locale === "he" ? "תיאור" : "Description"}
              </p>
              <p className="text-sm text-gray-700">{item.description}</p>
            </div>
          )}
          {item.location && item.location !== "Online" && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {locale === "he" ? "מפה" : "Map"}
              </p>
              <a
                href={mapUrl(item.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                {locale === "he" ? "צפה במפה" : "View on map"}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {t(locale, "board.guests")} ({item.guests.length})
              {item.guests.length > 0 && ` — ${attending} ${t(locale, "board.attending")}, ${notAttending} ${t(locale, "board.notAttending")}`}
            </p>
            {item.guests.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {item.guests.map((g) => (
                  <li key={g.email} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{g.name || g.email}</span>
                    <span className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRSVP(g.email, "attending")}
                        className={`px-2 py-0.5 rounded text-xs ${g.rsvp === "attending" ? "bg-accent text-white" : "bg-gray-100 text-gray-600"}`}
                      >
                        {t(locale, "board.attending")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRSVP(g.email, "not_attending")}
                        className={`px-2 py-0.5 rounded text-xs ${g.rsvp === "not_attending" ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
                      >
                        {t(locale, "board.notAttending")}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">{locale === "he" ? "אין מוזמנים" : "No guests"}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
