"use client";

import React from "react";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { UserCircle, LogOut } from "lucide-react";

/** Dev-only: show current chat identity and allow switching (for testing two users). */
export function DevUserSwitcher() {
  const { currentUser, setCurrentUser } = useInternalMessages();

  if (!currentUser) return null;

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={() => setCurrentUser(null)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200"
        title="Dev: switch chat user (clears identity and shows prompt again)"
      >
        <UserCircle className="w-3.5 h-3.5" />
        <span className="max-w-[80px] truncate">{currentUser.name}</span>
        <LogOut className="w-3 h-3 opacity-70" />
      </button>
    </div>
  );
}
