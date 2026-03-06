"use client";

import React from "react";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { LogOut } from "lucide-react";

/** Dev-only: show current chat identity and allow switching (for testing two users). */
export function DevUserSwitcher() {
  const { currentUser, setCurrentUser } = useInternalMessages();

  if (!currentUser) return null;

  return (
    <button
      type="button"
      onClick={() => setCurrentUser(null)}
      className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-[#008080] transition-colors"
      title="Dev: switch chat user (clears identity)"
      aria-label="Switch user"
    >
      <LogOut className="w-5 h-5" />
    </button>
  );
}
