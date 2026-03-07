"use client";

import { useState } from "react";
import type { ProfileBlock } from "@/lib/profile-types";

const TEAL = "#008080";

type Props = {
  block: ProfileBlock;
  profileUsername?: string;
  profileUserId?: string;
};

export function LeadFormBlock({ block, profileUsername, profileUserId }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const title = block.config.lead_form?.title ?? "Get in touch";
  const successMessage = block.config.lead_form?.successMessage ?? "Thanks! We'll be in touch soon.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          profileUsername: profileUsername ?? undefined,
          profileUserId: profileUserId ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send");
      }
      setStatus("success");
      setName("");
      setPhone("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center py-6">
          <p className="text-[#008080] font-medium text-lg">{successMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="lead-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="lead-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] outline-none"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="lead-phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="lead-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] outline-none"
            placeholder="Your phone"
          />
        </div>
        {status === "error" && (
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
        )}
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full py-3 rounded-xl bg-[#008080] text-white font-medium text-sm hover:bg-[#006666] disabled:opacity-60 transition-colors"
        >
          {status === "sending" ? "Sending…" : "Submit"}
        </button>
      </form>
    </section>
  );
}
