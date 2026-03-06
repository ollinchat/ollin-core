"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useBilling } from "@/contexts/BillingContext";
import type { BusinessProfile } from "@/contexts/ChatEngineContext";

export default function BusinessProfilePage() {
  const { businessProfile, setBusinessProfile } = useBilling();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profile: BusinessProfile = businessProfile ?? {
    legalName: "",
    taxId: "",
    address: "",
    businessLogo: "",
    bankDetails: {},
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBusinessProfile({ ...profile, businessLogo: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <Link href="/billing" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Business Profile (From)</h1>
      </header>
      <main className="max-w-lg mx-auto p-4 space-y-6">
        <p className="text-sm text-gray-500">
          This data auto-fills the &quot;From&quot; section on every invoice and quote.
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal name</label>
            <input
              type="text"
              value={profile.legalName}
              onChange={(e) => setBusinessProfile({ ...profile, legalName: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
              placeholder="Company or sole proprietor name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (H.P / E.M)</label>
            <input
              type="text"
              value={profile.taxId}
              onChange={(e) => setBusinessProfile({ ...profile, taxId: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
              placeholder="ח.פ / ע.מ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={profile.address}
              onChange={(e) => setBusinessProfile({ ...profile, address: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 resize-none"
              rows={2}
              placeholder="Business address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business logo</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            <div className="flex items-center gap-3">
              {profile.businessLogo ? (
                <img src={profile.businessLogo} alt="Logo" className="w-16 h-16 object-contain border border-gray-200 rounded-lg" />
              ) : (
                <div className="w-16 h-16 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-xs">Logo</div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Upload
              </button>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Bank details</h3>
            <div className="space-y-2">
              <input
                type="text"
                value={profile.bankDetails?.iban ?? ""}
                onChange={(e) => setBusinessProfile({
                  ...profile,
                  bankDetails: { ...profile.bankDetails, iban: e.target.value },
                })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm"
                placeholder="IBAN"
              />
              <input
                type="text"
                value={profile.bankDetails?.swift ?? ""}
                onChange={(e) => setBusinessProfile({
                  ...profile,
                  bankDetails: { ...profile.bankDetails, swift: e.target.value },
                })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm"
                placeholder="SWIFT"
              />
              <input
                type="text"
                value={profile.bankDetails?.bitLink ?? ""}
                onChange={(e) => setBusinessProfile({
                  ...profile,
                  bankDetails: { ...profile.bankDetails, bitLink: e.target.value },
                })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900 text-sm"
                placeholder="Bit / Payment link"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
