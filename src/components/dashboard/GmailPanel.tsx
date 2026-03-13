"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { GmailIcon } from "@/components/dashboard/ChannelBrandIcons";

type GmailMessageItem = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  labelIds?: string[];
};

export function GmailPanel() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<GmailMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const isConnected = status === "authenticated" && !!session;

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    setError(null);
    fetch("/api/gmail/messages?labelIds=INBOX&maxResults=25")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setMessages([]);
        } else {
          setMessages(data.messages ?? []);
        }
      })
      .catch((e) => {
        setError(e.message || "Failed to load");
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [isConnected]);

  useEffect(() => {
    if (!selectedId || !isConnected) {
      setBody(null);
      return;
    }
    fetch(`/api/gmail/messages/${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setBody("Could not load message.");
        else setBody(data.body ?? data.snippet ?? "");
      })
      .catch(() => setBody("Could not load message."));
  }, [selectedId, isConnected]);

  if (status === "loading") {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-50 border border-gray-200 p-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-gray-50 border border-gray-200 p-8">
        <GmailIcon className="w-14 h-14 mb-4 opacity-90" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Gmail</h3>
        <p className="text-sm text-gray-600 text-center max-w-sm mb-6">Connect your Google account to read and send mail from OllinChat.</p>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard?panel=4" })}
          className="px-5 py-2.5 rounded-xl text-white font-medium text-sm bg-[#ea4335] hover:bg-[#d33426] transition-colors shadow-sm"
        >
          Connect with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden w-full bg-white border border-gray-200">
      <div className="w-[320px] min-w-[280px] flex flex-col border-r border-gray-200 bg-gray-50/80">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-200">
          <GmailIcon className="w-6 h-6" />
          <span className="font-semibold text-gray-900">Inbox</span>
        </div>
        {error && <p className="px-3 py-2 text-sm text-red-600">{error}</p>}
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading inbox…</div>
        ) : (
          <ul className="flex-1 overflow-y-auto list-none m-0 p-0">
            {messages.length === 0 && <li className="px-4 py-6 text-sm text-gray-500 text-center">No messages</li>}
            {messages.map((m) => (
              <li key={m.id} className="border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left px-3 py-3 hover:bg-gray-100 transition-colors ${selectedId === m.id ? "bg-[#1a73e8]/10 border-l-2 border-[#1a73e8]" : ""}`}
                >
                  <p className="font-medium text-gray-900 text-sm truncate">{m.subject || "(No subject)"}</p>
                  <p className="text-xs text-gray-500 truncate">{m.from}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{m.snippet}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {selectedId ? (
          <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-800 whitespace-pre-wrap">
            {body === null ? "Loading…" : body}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Select a message</div>
        )}
      </div>
    </div>
  );
}
