"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useBilling } from "@/contexts/BillingContext";
import type { BusinessProfile } from "@/modules/billing/types";
import { defaultBusinessProfile } from "@/modules/billing/types";
import { ChevronLeft, Settings, Edit3, Save } from "lucide-react";

const TEAL = "#008080";

export default function BusinessSettingsPage() {
  const { businessProfile, setBusinessProfile } = useBilling();
  const profile = businessProfile || defaultBusinessProfile;

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<BusinessProfile>({ ...defaultBusinessProfile });

  useEffect(() => {
    setForm({
      legalName: profile.legalName || "",
      taxId: profile.taxId || "",
      address: profile.address || "",
      businessLogo: profile.businessLogo || "",
      bankDetails: profile.bankDetails || {},
    });
  }, [profile.legalName, profile.taxId, profile.address, profile.businessLogo, profile.bankDetails]);

  const handleSave = () => {
    setBusinessProfile({
      legalName: form.legalName.trim() || "",
      taxId: form.taxId.trim() || "",
      address: form.address.trim() || "",
      businessLogo: form.businessLogo || "",
      bankDetails: form.bankDetails || {},
    });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const displayProfile = editing ? form : profile;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans antialiased">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white shadow-sm">
        <Link
          href="/dashboard/finances/documents"
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5" style={{ color: TEAL }} />
          Business Settings
        </h1>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-[13px] font-semibold"
            style={{ backgroundColor: TEAL }}
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved" : "Save"}
          </button>
        )}
      </header>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-6">
        {/* Editable fields */}
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Business details</h2>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Legal name</label>
            <input
              type="text"
              value={form.legalName}
              onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
              disabled={!editing}
              className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-700"
              placeholder="Company name"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Tax ID (ח.פ / ע.מ)</label>
            <input
              type="text"
              value={form.taxId}
              onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
              disabled={!editing}
              className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
              placeholder="e.g. 512345678"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              disabled={!editing}
              className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
              placeholder="Business address"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Logo (URL or data URL)</label>
            <input
              type="text"
              value={form.businessLogo}
              onChange={(e) => setForm((p) => ({ ...p, businessLogo: e.target.value }))}
              disabled={!editing}
              className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
              placeholder="https://... or data:image/..."
            />
          </div>
        </section>

        {/* Sample document preview */}
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">Sample invoice preview</h2>
          <div className="p-4 bg-gray-50/80 border-t border-gray-100">
            <div className="max-w-md mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm">
              {displayProfile.businessLogo ? (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={displayProfile.businessLogo} alt="Logo" className="max-h-12 max-w-[180px] object-contain" />
                </div>
              ) : (
                <div className="mb-4 h-10 flex items-center">
                  <span className="text-gray-400 text-xs">Logo placeholder</span>
                </div>
              )}
              <p className="font-semibold text-gray-900">{displayProfile.legalName || "Your company name"}</p>
              {displayProfile.taxId && <p className="text-gray-600 text-xs">Tax ID: {displayProfile.taxId}</p>}
              {displayProfile.address && <p className="text-gray-600 text-xs mt-0.5">{displayProfile.address}</p>}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-gray-500 text-xs">Client: Sample Client Ltd</p>
                <p className="text-gray-500 text-xs">Date: {new Date().toISOString().slice(0, 10)}</p>
                <table className="w-full mt-3 text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-1.5 font-medium text-gray-600">Description</th>
                      <th className="text-right py-1.5 font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-700">Sample item</td>
                      <td className="py-1.5 text-right tabular-nums">1,200.00</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-right font-semibold text-gray-900 mt-2">Total: 1,200.00</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
