"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { t } from "@/lib/translations";
import { ChevronLeft, MessageCircle, Send } from "lucide-react";

type Props = { onClose: () => void };

export function AIChatModal({ onClose }: Props) {
  const { locale } = useLocale();
  const [input, setInput] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-md max-w-md w-full max-h-[85vh] flex flex-col border-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 hover:shadow-soft transition-all flex items-center gap-1"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-1 justify-center pr-12">
            <MessageCircle className="w-5 h-5 text-accent" />
            {t(locale, "dashboard.aiChat")}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-h-[200px] flex flex-col items-center justify-center text-center">
          <p className="text-gray-500 text-sm">Start a conversation. (AI Chat placeholder.)</p>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-2xl border-0 bg-gray-100 shadow-soft px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-accent/30 min-h-[44px]"
          />
          <motion.button
            type="button"
            className="rounded-2xl px-4 py-3 text-sm font-medium bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft hover:shadow-glow-subtle transition-shadow inline-flex items-center gap-2"
            whileTap={{ scale: 0.98 }}
          >
            <Send className="w-4 h-4" />
            Send
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
