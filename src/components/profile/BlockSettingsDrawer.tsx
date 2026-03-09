"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import type { ProfileBlock, TestimonialItem, FAQItem } from "@/lib/profile-types";
import { generateUUID } from "@/lib/uuid";

type Props = {
  block: ProfileBlock;
  onClose: () => void;
  onSave: (updated: ProfileBlock) => void;
};

export function BlockSettingsDrawer({ block, onClose, onSave }: Props) {
  const [local, setLocal] = useState<ProfileBlock>(block);

  useEffect(() => {
    setLocal(block);
  }, [block]);

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col max-h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Block settings</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {local.type === "testimonials" && (
            <TestimonialsSettings config={local.config.testimonials} onChange={(items) => setLocal((b) => ({ ...b, config: { ...b.config, testimonials: { items } } }))} />
          )}
          {local.type === "faq" && (
            <FAQSettings config={local.config.faq} onChange={(faqs) => setLocal((b) => ({ ...b, config: { ...b.config, faq: { faqs } } }))} />
          )}
          {local.type === "lead_form" && (
            <LeadFormSettings config={local.config.lead_form} onChange={(lead_form) => setLocal((b) => ({ ...b, config: { ...b.config, lead_form } }))} />
          )}
          {local.type === "countdown" && (
            <CountdownSettings config={local.config.countdown} onChange={(countdown) => setLocal((b) => ({ ...b, config: { ...b.config, countdown } }))} />
          )}
          {!["testimonials", "faq", "lead_form", "countdown"].includes(local.type) && (
            <p className="text-sm text-gray-500">Edit this block in the main form.</p>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 rounded-xl bg-[#008080] text-white text-sm font-medium hover:bg-[#006666]">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TestimonialsSettings({
  config,
  onChange,
}: {
  config: { items: TestimonialItem[] } | undefined;
  onChange: (items: TestimonialItem[]) => void;
}) {
  const items = config?.items ?? [];

  const add = () => {
    onChange([...items, { id: generateUUID(), name: "", text: "", stars: 5, avatar: "" }]);
  };

  const update = (id: string, updates: Partial<TestimonialItem>) => {
    onChange(items.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const remove = (id: string) => {
    onChange(items.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Testimonials</h3>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-sm text-[#008080] font-medium">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {items.map((t) => (
        <div key={t.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
          <input type="text" value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <textarea value={t.text} onChange={(e) => update(t.id, { text: e.target.value })} placeholder="Review text" rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input type="number" min={1} max={5} value={t.stars} onChange={(e) => update(t.id, { stars: Number(e.target.value) || 5 })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input type="text" value={t.avatar} onChange={(e) => update(t.id, { avatar: e.target.value })} placeholder="Avatar URL" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <button type="button" onClick={() => remove(t.id)} className="text-sm text-red-500 hover:underline">Remove</button>
        </div>
      ))}
    </div>
  );
}

function FAQSettings({
  config,
  onChange,
}: {
  config: { faqs: FAQItem[] } | undefined;
  onChange: (faqs: FAQItem[]) => void;
}) {
  const faqs = config?.faqs ?? [];

  const add = () => {
    onChange([...faqs, { id: generateUUID(), question: "", answer: "" }]);
  };

  const update = (id: string, updates: Partial<FAQItem>) => {
    onChange(faqs.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const remove = (id: string) => {
    onChange(faqs.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">FAQ</h3>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-sm text-[#008080] font-medium">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {faqs.map((f) => (
        <div key={f.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
          <input type="text" value={f.question} onChange={(e) => update(f.id, { question: e.target.value })} placeholder="Question" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <textarea value={f.answer} onChange={(e) => update(f.id, { answer: e.target.value })} placeholder="Answer" rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <button type="button" onClick={() => remove(f.id)} className="text-sm text-red-500 hover:underline">Remove</button>
        </div>
      ))}
    </div>
  );
}

function LeadFormSettings({
  config,
  onChange,
}: {
  config: ProfileBlock["config"]["lead_form"];
  onChange: (lead_form: NonNullable<ProfileBlock["config"]["lead_form"]>) => void;
}) {
  const title = config?.title ?? "Get in touch";
  const successMessage = config?.successMessage ?? "Thanks! We'll be in touch soon.";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Form title</label>
        <input type="text" value={title} onChange={(e) => onChange({ title: e.target.value, successMessage })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Success message</label>
        <input type="text" value={successMessage} onChange={(e) => onChange({ title, successMessage: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
    </div>
  );
}

function CountdownSettings({
  config,
  onChange,
}: {
  config: ProfileBlock["config"]["countdown"];
  onChange: (countdown: NonNullable<ProfileBlock["config"]["countdown"]>) => void;
}) {
  const target_date = config?.target_date ?? "";
  const label = config?.label ?? "Countdown";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
        <input type="text" value={label} onChange={(e) => onChange({ target_date, label: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target date & time</label>
        <input type="datetime-local" value={target_date.slice(0, 16)} onChange={(e) => onChange({ target_date: e.target.value ? new Date(e.target.value).toISOString() : "", label })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
