"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useBilling } from "@/contexts/BillingContext";
import type { BusinessProfile } from "@/contexts/ChatEngineContext";
import { ChevronLeft, Settings, Edit3, Save, Upload } from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";

const TEAL = "#008080";

const emptyProfile: BusinessProfile = {
  legalName: "",
  taxId: "",
  address: "",
  businessLogo: "",
  bankDetails: {},
};

export default function BusinessSettingsPage() {
  const { businessProfile, setBusinessProfile } = useBilling();
  const profile = businessProfile || emptyProfile;

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [useSavedSignature, setUseSavedSignature] = useState(!!profile.signature);
  const [form, setForm] = useState<BusinessProfile>({
    ...emptyProfile,
    legalNameEn: profile.legalNameEn ?? profile.legalName ?? "",
    legalNameHe: profile.legalNameHe ?? "",
    addressEn: profile.addressEn ?? profile.address ?? "",
    addressHe: profile.addressHe ?? "",
    legalName: profile.legalName || "",
    taxId: profile.taxId || "",
    address: profile.address || "",
    businessLogo: profile.businessLogo || "",
    signature: profile.signature ?? "",
    bankDetails: profile.bankDetails || {},
  });
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      legalName: profile.legalName || prev.legalNameEn || prev.legalNameHe || "",
      legalNameEn: profile.legalNameEn ?? profile.legalName ?? "",
      legalNameHe: profile.legalNameHe ?? "",
      addressEn: profile.addressEn ?? profile.address ?? "",
      addressHe: profile.addressHe ?? "",
      address: profile.address || "",
      taxId: profile.taxId || "",
      businessLogo: profile.businessLogo || "",
      signature: profile.signature ?? "",
      bankDetails: profile.bankDetails || {},
    }));
    setUseSavedSignature(!!profile.signature);
  }, [profile.legalName, profile.legalNameEn, profile.legalNameHe, profile.address, profile.addressEn, profile.addressHe, profile.taxId, profile.businessLogo, profile.signature, profile.bankDetails]);

  const handleSave = () => {
    const legalName = form.legalNameEn?.trim() || form.legalNameHe?.trim() || form.legalName?.trim() || "";
    const address = form.addressEn?.trim() || form.addressHe?.trim() || form.address?.trim() || "";
    setBusinessProfile({
      ...profile,
      legalName,
      legalNameEn: form.legalNameEn?.trim() || undefined,
      legalNameHe: form.legalNameHe?.trim() || undefined,
      address,
      addressEn: form.addressEn?.trim() || undefined,
      addressHe: form.addressHe?.trim() || undefined,
      taxId: form.taxId?.trim() || "",
      businessLogo: form.businessLogo || "",
      signature: form.signature || undefined,
      bankDetails: form.bankDetails || {},
    });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, businessLogo: (reader.result as string) || "" }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSignatureSave = (dataUrl: string) => {
    setForm((p) => ({ ...p, signature: dataUrl }));
  };

  const displayProfile = editing ? form : {
    ...profile,
    legalNameEn: profile.legalNameEn ?? profile.legalName,
    legalNameHe: profile.legalNameHe,
    addressEn: profile.addressEn ?? profile.address,
    addressHe: profile.addressHe,
    businessLogo: profile.businessLogo,
    signature: profile.signature,
  };

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
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company name</h2>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Company name (English)</label>
            <input
              type="text"
              value={form.legalNameEn ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, legalNameEn: e.target.value, legalName: e.target.value.trim() || p.legalName }))}
              disabled={!editing}
              className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
              placeholder="Company name (English)"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">שם החברה (עברית)</label>
            <input
              type="text"
              value={form.legalNameHe ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, legalNameHe: e.target.value }))}
              disabled={!editing}
              className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
              placeholder="שם החברה"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</h2>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Address (English)</label>
            <input
              type="text"
              value={form.addressEn ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, addressEn: e.target.value, address: e.target.value.trim() || p.address }))}
              disabled={!editing}
              className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
              placeholder="Business address (English)"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">כתובת (עברית)</label>
            <input
              type="text"
              value={form.addressHe ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, addressHe: e.target.value }))}
              disabled={!editing}
              className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
              placeholder="כתובת"
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tax &amp; Logo</h2>
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
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Logo</label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            {editing ? (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                {form.businessLogo ? "Change logo" : "Upload logo"}
              </button>
            ) : null}
            {form.businessLogo && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.businessLogo} alt="Logo" className="max-h-16 object-contain rounded-lg border border-gray-200" />
              </div>
            )}
          </div>
        </section>

        {editing && (
          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Digital signature</h3>
            <p className="text-[11px] text-gray-500 mb-2">Draw your signature below or use the saved one. It will appear on PDF invoices.</p>
            <SignaturePad
              onSave={handleSignatureSave}
              savedSignatureDataUrl={form.signature || null}
              useSavedSignature={useSavedSignature}
              onUseSavedChange={setUseSavedSignature}
              locale="en"
              labelSign="Sign here"
              labelUseSaved="Use saved signature"
            />
          </section>
        )}

        {/* Live preview */}
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
              <p className="font-semibold text-gray-900">{displayProfile.legalNameEn || displayProfile.legalName || "Company name (EN)"}</p>
              {displayProfile.legalNameHe && <p className="text-gray-700 text-xs font-medium">{displayProfile.legalNameHe}</p>}
              {displayProfile.taxId && <p className="text-gray-600 text-xs">Tax ID: {displayProfile.taxId}</p>}
              {(displayProfile.addressEn || displayProfile.address) && (
                <p className="text-gray-600 text-xs mt-0.5">{displayProfile.addressEn || displayProfile.address}</p>
              )}
              {displayProfile.addressHe && <p className="text-gray-600 text-xs">{displayProfile.addressHe}</p>}
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
                {displayProfile.signature && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-500 mb-1">Authorized signature</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={displayProfile.signature} alt="Signature" className="max-h-14 max-w-[160px] object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
