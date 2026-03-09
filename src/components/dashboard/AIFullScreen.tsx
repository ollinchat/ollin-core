"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import {
  CircleCheck,
  ChevronLeft,
  Send,
  Plus,
  ScanLine,
  ListTodo,
  BarChart2,
  Mic,
  ImagePlus,
  MapPin,
  Brain,
} from "lucide-react";
import { generateUUID } from "@/lib/uuid";

type AIMessage = { id: string; role: "user" | "assistant"; text: string; createdAt: number };

const PLUS_ACTIONS: { id: string; labelEn: string; labelHe: string; icon: typeof ScanLine }[] = [
  { id: "scan", labelEn: "Scan", labelHe: "סריקה", icon: ScanLine },
  { id: "task", labelEn: "Task", labelHe: "משימה", icon: ListTodo },
  { id: "poll", labelEn: "Poll", labelHe: "סקר", icon: BarChart2 },
  { id: "audio", labelEn: "Audio Note", labelHe: "הערת קול", icon: Mic },
  { id: "media", labelEn: "Media", labelHe: "מדיה", icon: ImagePlus },
  { id: "location", labelEn: "Location", labelHe: "מיקום", icon: MapPin },
];

const AI_OPTIONS: { id: string; labelEn: string; labelHe: string }[] = [
  { id: "ollin", labelEn: "Custom Ollin Tool", labelHe: "אולין מותאם" },
  { id: "gpt4", labelEn: "GPT-4", labelHe: "GPT-4" },
  { id: "claude", labelEn: "Claude", labelHe: "Claude" },
];

type AIFullScreenProps = {
  onClose: () => void;
};

export function AIFullScreen({ onClose }: AIFullScreenProps) {
  const { locale } = useLocale();
  const isHe = locale === "he";
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [selectedAI, setSelectedAI] = useState("ollin");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: AIMessage = { id: generateUUID(), role: "user", text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const reply: AIMessage = {
      id: generateUUID(),
      role: "assistant",
      text: isHe ? "התקבל. חיבור לאולין יגיע בקרוב." : "Got it. Ollin connection coming soon.",
      createdAt: Date.now() + 1,
    };
    setMessages((prev) => [...prev, reply]);
  };

  const handlePlusAction = (id: string) => {
    setPlusMenuOpen(false);
    // Placeholder: could insert a special message or open a modal
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f8f9fa]">
      <header className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1"
          aria-label={isHe ? "חזרה" : "Back"}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{isHe ? "חזרה" : "Back"}</span>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CircleCheck className="w-6 h-6 text-[#008080] shrink-0" strokeWidth={2} />
          <span className="text-sm font-semibold text-gray-900 truncate">{isHe ? "שיחה עם אולין" : "Chat with Ollin"}</span>
        </div>
      </header>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">{isHe ? "התחל שיחה עם אולין." : "Start a conversation with Ollin."}</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === "user"
                  ? "bg-[#008080] text-white"
                  : "bg-white border border-gray-200 text-gray-900 shadow-sm"
              }`}
            >
              {m.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <CircleCheck className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                  <span className="text-xs font-medium text-gray-500">Ollin</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-3 pt-2 bg-white border-t border-gray-200">
        {/* + Action menu */}
        {plusMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" aria-hidden onClick={() => setPlusMenuOpen(false)} />
            <div className="relative z-50 mb-2 px-1">
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                {PLUS_ACTIONS.map(({ id, labelEn, labelHe, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handlePlusAction(id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-[#008080]/08 hover:border-[#008080]/20 text-sm text-gray-700"
                  >
                    <Icon className="w-4 h-4 text-[#008080]" strokeWidth={2} />
                    {isHe ? labelHe : labelEn}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          {/* Brain (AI selector) + Plus (tools) clustered at point of typing */}
          <div className="flex flex-col gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIntegrationsOpen((o) => !o)}
                  className="p-2.5 rounded-xl border border-gray-200 bg-[#f8f9fa] text-[#008080] hover:bg-[#008080]/10 transition-colors"
                  title={isHe ? "מודל / כלי AI" : "AI model or tool"}
                  aria-label={isHe ? "הגדרות מודל" : "AI model settings"}
                  aria-expanded={integrationsOpen}
                >
                  <Brain className="w-5 h-5" strokeWidth={2} />
                </button>
                {integrationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" aria-hidden onClick={() => setIntegrationsOpen(false)} />
                    <div className="absolute left-0 bottom-full mb-1 z-50 w-52 py-2 rounded-xl bg-white border border-gray-200 shadow-lg">
                      <div className="px-3 py-1.5 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{isHe ? "מודל / כלי" : "Model / Tool"}</p>
                      </div>
                      {AI_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => { setSelectedAI(opt.id); setIntegrationsOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm ${selectedAI === opt.id ? "bg-[#008080]/10 text-[#008080] font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          {isHe ? opt.labelHe : opt.labelEn}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPlusMenuOpen((o) => !o)}
                className="p-2.5 rounded-xl border border-gray-200 bg-[#f8f9fa] text-[#008080] hover:bg-[#008080]/10 transition-colors"
                aria-label={isHe ? "פעולות" : "Actions"}
                aria-expanded={plusMenuOpen}
              >
                <Plus className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={isHe ? "שאל את אולין..." : "Talk to Ollin..."}
            rows={3}
            className="flex-1 min-h-[80px] max-h-[160px] px-4 py-3 rounded-2xl border border-gray-200 bg-[#f8f9fa] text-base text-gray-900 placeholder-gray-500 resize-none focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            className="p-3 rounded-2xl bg-[#008080] text-white hover:bg-[#006666] transition-colors shrink-0"
            aria-label={isHe ? "שלח" : "Send"}
          >
            <Send className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
