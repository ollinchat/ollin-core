"use client";

import { useState } from "react";
import type { ProfileBlock, ContactFormBlockConfig } from "@/lib/profile-builder-types";

export function ContactFormBlock({ block }: { block: ProfileBlock }) {
  const config = block.config as ContactFormBlockConfig;
  const [sent, setSent] = useState(false);
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSent(true); };
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {sent ? <p className="text-teal-600 font-medium py-4">Thanks! We will be in touch.</p> : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" placeholder="Your name" className="w-full rounded-xl border border-gray-200 px-4 py-2.5" required />
          <input type="email" placeholder="Email" className="w-full rounded-xl border border-gray-200 px-4 py-2.5" required />
          <textarea placeholder="Message" rows={4} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 resize-none" required />
          <button type="submit" className="w-full py-3 rounded-xl bg-teal-600 text-white font-medium">Send</button>
        </form>
      )}
    </section>
  );
}
