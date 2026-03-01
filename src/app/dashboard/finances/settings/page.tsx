"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Hash, Save } from "lucide-react";
import {
  loadDocumentNumbering,
  saveDocumentNumbering,
} from "@/lib/document-numbering";
import type { DocumentNumberingConfig } from "@/lib/finance-types";

export default function DocumentNumberingSettingsPage() {
  const [config, setConfig] = useState<DocumentNumberingConfig>({
    quote: 1,
    invoice: 1,
    receipt: 1,
    deliveryNote: 1,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(loadDocumentNumbering());
  }, []);

  const handleSave = () => {
    saveDocumentNumbering({
      quote: Math.max(1, Math.floor(config.quote) || 1),
      invoice: Math.max(1, Math.floor(config.invoice) || 1),
      receipt: Math.max(1, Math.floor(config.receipt) || 1),
      deliveryNote: Math.max(1, Math.floor(config.deliveryNote) || 1),
    });
    setConfig(loadDocumentNumbering());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link
          href="/dashboard/finances"
          className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <Hash className="w-5 h-5 text-[#008080]" />
          Document Numbering
        </h1>
      </header>
      <div className="flex-1 p-4 space-y-6">
        <p className="text-sm text-gray-600">
          Set the next starting number for each document type. New documents will use this number and then increment.
        </p>
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Quote (הצעת מחיר)</label>
            <input
              type="number"
              min={1}
              value={config.quote}
              onChange={(e) => setConfig((c) => ({ ...c, quote: parseInt(e.target.value, 10) || 1 }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Invoice (חשבונית מס)</label>
            <input
              type="number"
              min={1}
              value={config.invoice}
              onChange={(e) => setConfig((c) => ({ ...c, invoice: parseInt(e.target.value, 10) || 1 }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (קבלה)</label>
            <input
              type="number"
              min={1}
              value={config.receipt}
              onChange={(e) => setConfig((c) => ({ ...c, receipt: parseInt(e.target.value, 10) || 1 }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note (תעודת משלוח)</label>
            <input
              type="number"
              min={1}
              value={config.deliveryNote}
              onChange={(e) => setConfig((c) => ({ ...c, deliveryNote: parseInt(e.target.value, 10) || 1 }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080]"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#008080] text-white font-medium shadow-sm hover:bg-[#006666] transition-colors"
          >
            <Save className="w-5 h-5" />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
        <Link
          href="/dashboard/finances/company-profile"
          className="block rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          Account Settings (Company name, Dealer type, VAT, Logo)
        </Link>
      </div>
    </div>
  );
}
