"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Plus, X } from "lucide-react";

export type PollContact = { id: string; name: string; email: string };

export type PollCreatorData = {
  question: string;
  options: string[];
  anonymousResults: boolean;
  recipientIds: string[];
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] outline-none";
const labelClass = "text-xs font-medium text-gray-700 block mb-1";

type Props = {
  locale: "en" | "he";
  contacts: PollContact[];
  onSubmit?: (data: PollCreatorData) => void;
  onSendToContacts?: (data: PollCreatorData, contactIds: string[]) => void;
  /** Optional compact mode (e.g. inside modal) */
  compact?: boolean;
};

export function PollCreator({
  locale,
  contacts,
  onSubmit,
  onSendToContacts,
  compact = false,
}: Props) {
  const isHe = locale === "he";
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymousResults, setAnonymousResults] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredContacts = recipientSearch.trim()
    ? contacts.filter(
        (c) =>
          !selectedIds.includes(c.id) &&
          (c.name?.toLowerCase().includes(recipientSearch.toLowerCase()) ||
            c.email?.toLowerCase().includes(recipientSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        recipientInputRef.current &&
        !recipientInputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const addOption = () => setOptions((prev) => [...prev, ""]);
  const setOption = (i: number, v: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const addRecipient = (id: string) => {
    if (!selectedIds.includes(id)) setSelectedIds((prev) => [...prev, id]);
    setRecipientSearch("");
    setDropdownOpen(false);
  };
  const removeRecipient = (id: string) => setSelectedIds((prev) => prev.filter((x) => x !== id));

  const selectedContacts = selectedIds
    .map((id) => contacts.find((c) => c.id === id))
    .filter(Boolean) as PollContact[];

  const handleSendPoll = () => {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || opts.length < 1) return;

    const data: PollCreatorData = {
      question: question.trim(),
      options: opts,
      anonymousResults,
      recipientIds: selectedIds,
    };

    if (onSendToContacts && selectedIds.length > 0) {
      onSendToContacts(data, selectedIds);
    }
    if (onSubmit) {
      onSubmit(data);
    }

    setToast(isHe ? "הסקר נשלח!" : "Poll sent!");
  };

  const optsFilled = options.map((o) => o.trim()).filter(Boolean).length >= 1;
  const canSend = question.trim() && optsFilled;

  return (
    <div
      className={
        compact
          ? "space-y-4"
          : "rounded-2xl bg-white border border-[#008080]/20 shadow-sm p-5 w-full max-w-md space-y-4"
      }
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-4 right-4 z-[200] flex justify-center pointer-events-none sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-sm"
          >
            <div className="bg-[#008080] text-white px-4 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">✓</span>
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-[#008080]/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-[#008080]" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          {isHe ? "צור סקר" : "Create a Poll"}
        </h2>
      </div>

      {/* Question */}
      <div>
        <label className={labelClass}>{isHe ? "שאלה" : "Poll question"}</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={isHe ? "שאל שאלה…" : "Ask a question…"}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Options */}
      <div>
        <label className={`${labelClass} mb-2`}>{isHe ? "אפשרויות" : "Options"}</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-400 w-5">{i + 1}.</span>
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`${isHe ? "אפשרות" : "Option"} ${i + 1}`}
                className={inputClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-[#008080] hover:bg-[#008080]/10 border border-dashed border-[#008080]/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isHe ? "הוסף אפשרות" : "Add option"}
          </button>
        </div>
      </div>

      {/* Anonymous Results toggle */}
      <div className="flex items-center justify-between rounded-xl border border-[#008080]/20 bg-[#008080]/5 px-4 py-3">
        <span className="text-sm font-medium text-gray-800">
          {isHe ? "תוצאות אנונימיות" : "Anonymous results"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={anonymousResults}
          onClick={() => setAnonymousResults((prev) => !prev)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            anonymousResults ? "bg-[#008080]" : "bg-gray-200"
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              anonymousResults ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        {anonymousResults
          ? isHe
            ? "מצביעים יראו רק סטטיסטיקות."
            : "Voters will only see stats."
          : isHe
            ? "מצביעים יראו מי בחר מה."
            : "Voters will see who voted for what."}
      </p>

      {/* Recipients: searchable dropdown (same pattern as EventForm) */}
      <div className="relative" ref={dropdownRef}>
        <label className={labelClass}>
          {isHe ? "שלח אל (אנשי קשר)" : "Send to (Contacts)"}
        </label>
        <input
          ref={recipientInputRef}
          type="text"
          value={recipientSearch}
          onChange={(e) => {
            setRecipientSearch(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          placeholder={isHe ? "חפש שם או אימייל…" : "Search name or email…"}
          className={inputClass}
        />
        {dropdownOpen && filteredContacts.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg py-1 max-h-48 overflow-y-auto">
            {filteredContacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addRecipient(c.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-[#008080]/10 transition-colors"
              >
                <span className="font-medium truncate">{c.name || c.email}</span>
                {c.email && c.name && (
                  <span className="text-xs text-gray-500 truncate">{c.email}</span>
                )}
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
                <button
                  type="button"
                  onClick={() => removeRecipient(c.id)}
                  className="p-0.5 rounded-full hover:bg-[#008080]/30"
                  aria-label="Remove"
                >
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

      {/* Send Poll */}
      <button
        type="button"
        onClick={handleSendPoll}
        disabled={!canSend}
        className="w-full rounded-xl px-4 py-2.5 text-sm font-medium bg-[#008080] text-white hover:bg-[#006666] disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
      >
        {isHe ? "שלח סקר" : "Send Poll"}
      </button>
    </div>
  );
}
