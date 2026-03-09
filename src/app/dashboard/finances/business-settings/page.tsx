"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useBilling } from "@/contexts/BillingContext";
import type { BusinessProfile } from "@/contexts/ChatEngineContext";
import type { DocumentLanguagePreference } from "@/contexts/ChatEngineContext";
import { ChevronLeft, Settings, Edit3, Save, Upload, PenLine, ImageUp, FileText, Receipt } from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";

const TEAL = "#008080";

const emptyProfile: BusinessProfile = {
  legalName: "",
  taxId: "",
  address: "",
  businessLogo: "",
  bankDetails: {},
};

type SignatureMode = "draw" | "upload";
type PreviewDocType = "invoice" | "receipt";

function formatAddressLine(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).map((s) => s?.trim()).filter(Boolean).join(", ") || "";
}

export default function BusinessSettingsPage() {
  const { businessProfile, setBusinessProfile } = useBilling();
  const profile = businessProfile || emptyProfile;

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [useSavedSignature, setUseSavedSignature] = useState(!!profile.signature);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("draw");
  const [previewDocType, setPreviewDocType] = useState<PreviewDocType>("invoice");
  const [form, setForm] = useState<BusinessProfile>({
    ...emptyProfile,
    legalNameEn: profile.legalNameEn ?? profile.legalName ?? "",
    legalNameHe: profile.legalNameHe ?? "",
    addressEn: profile.addressEn ?? profile.address ?? "",
    addressHe: profile.addressHe ?? "",
    addressCityEn: profile.addressCityEn ?? "",
    addressCityHe: profile.addressCityHe ?? "",
    addressStreetEn: profile.addressStreetEn ?? "",
    addressStreetHe: profile.addressStreetHe ?? "",
    addressZipEn: profile.addressZipEn ?? "",
    addressZipHe: profile.addressZipHe ?? "",
    addressCountryEn: profile.addressCountryEn ?? "",
    addressCountryHe: profile.addressCountryHe ?? "",
    officeEmail: profile.officeEmail ?? "",
    officePhone: profile.officePhone ?? "",
    legalName: profile.legalName || "",
    taxId: profile.taxId || "",
    address: profile.address || "",
    businessLogo: profile.businessLogo || "",
    signature: profile.signature ?? "",
    bankDetails: {
      ...(profile.bankDetails || {}),
      bankName: profile.bankDetails?.bankName ?? "",
      branchNumber: profile.bankDetails?.branchNumber ?? "",
      accountNumber: profile.bankDetails?.accountNumber ?? "",
    },
    documentLanguage: profile.documentLanguage ?? "bilingual",
    initialInvoiceNumber: profile.initialInvoiceNumber ?? 101,
    initialReceiptNumber: profile.initialReceiptNumber ?? 101,
    initialQuoteNumber: profile.initialQuoteNumber ?? 101,
    initialDeliveryNoteNumber: profile.initialDeliveryNoteNumber ?? 101,
  });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      legalName: profile.legalName || prev.legalNameEn || prev.legalNameHe || "",
      legalNameEn: profile.legalNameEn ?? profile.legalName ?? "",
      legalNameHe: profile.legalNameHe ?? "",
      addressEn: profile.addressEn ?? profile.address ?? "",
      addressHe: profile.addressHe ?? "",
      addressCityEn: profile.addressCityEn ?? "",
      addressCityHe: profile.addressCityHe ?? "",
      addressStreetEn: profile.addressStreetEn ?? "",
      addressStreetHe: profile.addressStreetHe ?? "",
      addressZipEn: profile.addressZipEn ?? "",
      addressZipHe: profile.addressZipHe ?? "",
      addressCountryEn: profile.addressCountryEn ?? "",
      addressCountryHe: profile.addressCountryHe ?? "",
      officeEmail: profile.officeEmail ?? "",
      officePhone: profile.officePhone ?? "",
      address: profile.address || "",
      taxId: profile.taxId || "",
      businessLogo: profile.businessLogo || "",
      signature: profile.signature ?? "",
      bankDetails: { ...(profile.bankDetails || {}), bankName: profile.bankDetails?.bankName ?? "", branchNumber: profile.bankDetails?.branchNumber ?? "", accountNumber: profile.bankDetails?.accountNumber ?? "" },
      documentLanguage: profile.documentLanguage ?? "bilingual",
      initialInvoiceNumber: profile.initialInvoiceNumber ?? 101,
      initialReceiptNumber: profile.initialReceiptNumber ?? 101,
      initialQuoteNumber: profile.initialQuoteNumber ?? 101,
      initialDeliveryNoteNumber: profile.initialDeliveryNoteNumber ?? 101,
    }));
    setUseSavedSignature(!!profile.signature);
  }, [
    profile.legalName,
    profile.legalNameEn,
    profile.legalNameHe,
    profile.address,
    profile.addressEn,
    profile.addressHe,
    profile.addressCityEn,
    profile.addressCityHe,
    profile.addressStreetEn,
    profile.addressStreetHe,
    profile.addressZipEn,
    profile.addressZipHe,
    profile.taxId,
    profile.businessLogo,
    profile.signature,
    profile.bankDetails,
    profile.documentLanguage,
    profile.initialInvoiceNumber,
    profile.initialReceiptNumber,
    profile.initialQuoteNumber,
    profile.initialDeliveryNoteNumber,
    profile.addressCountryEn,
    profile.addressCountryHe,
    profile.officeEmail,
    profile.officePhone,
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    const legalName = form.legalNameEn?.trim() || form.legalNameHe?.trim() || form.legalName?.trim() || "";
    const addressEn = form.addressStreetEn?.trim() || form.addressCityEn?.trim() || form.addressZipEn?.trim() || form.addressCountryEn?.trim()
      ? formatAddressLine([form.addressStreetEn, form.addressCityEn, form.addressZipEn, form.addressCountryEn])
      : (form.addressEn?.trim() || "");
    const addressHe = form.addressStreetHe?.trim() || form.addressCityHe?.trim() || form.addressZipHe?.trim() || form.addressCountryHe?.trim()
      ? formatAddressLine([form.addressStreetHe, form.addressCityHe, form.addressZipHe, form.addressCountryHe])
      : (form.addressHe?.trim() || "");
    const address = addressEn || addressHe || form.address?.trim() || "";
    setBusinessProfile({
      ...profile,
      legalName,
      legalNameEn: form.legalNameEn?.trim() || undefined,
      legalNameHe: form.legalNameHe?.trim() || undefined,
      address,
      addressEn: addressEn || undefined,
      addressHe: addressHe || undefined,
      addressCityEn: form.addressCityEn?.trim() || undefined,
      addressCityHe: form.addressCityHe?.trim() || undefined,
      addressStreetEn: form.addressStreetEn?.trim() || undefined,
      addressStreetHe: form.addressStreetHe?.trim() || undefined,
      addressZipEn: form.addressZipEn?.trim() || undefined,
      addressZipHe: form.addressZipHe?.trim() || undefined,
      addressCountryEn: form.addressCountryEn?.trim() || undefined,
      addressCountryHe: form.addressCountryHe?.trim() || undefined,
      officeEmail: form.officeEmail?.trim() || undefined,
      officePhone: form.officePhone?.trim() || undefined,
      taxId: form.taxId?.trim() || "",
      businessLogo: form.businessLogo || "",
      signature: form.signature || undefined,
      bankDetails: { ...profile.bankDetails, ...form.bankDetails, bankName: form.bankDetails?.bankName?.trim() || undefined, branchNumber: form.bankDetails?.branchNumber?.trim() || undefined, accountNumber: form.bankDetails?.accountNumber?.trim() || undefined },
      documentLanguage: form.documentLanguage ?? "bilingual",
      initialInvoiceNumber: form.initialInvoiceNumber ?? 101,
      initialReceiptNumber: form.initialReceiptNumber ?? 101,
      initialQuoteNumber: form.initialQuoteNumber ?? 101,
      initialDeliveryNoteNumber: form.initialDeliveryNoteNumber ?? 101,
    });
    setEditing(false);
    setSaved(true);
    setIsSaving(false);
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

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpe?g)$/i)) return;
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, signature: (reader.result as string) || "" }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSignatureSave = (dataUrl: string) => {
    setForm((p) => ({ ...p, signature: dataUrl }));
  };

  const updateBankDetail = (key: "bankName" | "branchNumber" | "accountNumber", value: string) => {
    setForm((p) => ({ ...p, bankDetails: { ...(p.bankDetails || {}), [key]: value } }));
  };

  const inputBase =
    "w-full rounded-sm border border-gray-100 px-3 py-2.5 text-sm font-medium text-gray-900 placeholder-slate-400 disabled:bg-gray-50/80 focus:ring-1 focus:ring-[#008080]/20 focus:border-[#008080]/40 outline-none transition-all";
  const labelBase = "block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5";
  const sectionTitle = "text-xs font-bold text-gray-600 uppercase tracking-wider mb-4";

  const lang = form.documentLanguage ?? "bilingual";
  const showEn = lang === "en" || lang === "bilingual";
  const showHe = lang === "he" || lang === "bilingual";
  const isRTL = lang === "he";
  const previewAddrEn = formatAddressLine([form.addressStreetEn, form.addressCityEn, form.addressZipEn, form.addressCountryEn]) || form.addressEn || "";
  const previewAddrHe = formatAddressLine([form.addressStreetHe, form.addressCityHe, form.addressZipHe, form.addressCountryHe]) || form.addressHe || "";
  const showBankInPreview = previewDocType === "invoice";

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans antialiased">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
        <Link
          href="/dashboard/finances/documents"
          className="p-2 rounded-sm text-slate-500 hover:text-gray-900 hover:bg-gray-50 flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="flex-1 font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5" style={{ color: TEAL }} />
          Business Settings
        </h1>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-gray-100 bg-white text-sm font-semibold text-slate-600 hover:bg-gray-50"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-white text-sm font-semibold disabled:opacity-70 disabled:pointer-events-none"
            style={{ backgroundColor: TEAL }}
          >
            {isSaving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {saved ? "Saved" : "Save"}
              </>
            )}
          </button>
        )}
      </header>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-6 bg-white">
        {/* Company name */}
        <section className="rounded-sm bg-white border border-gray-100 p-5 space-y-4">
          <h2 className={sectionTitle}>Company name</h2>
          <div>
            <label className={labelBase}>Company name (English)</label>
            <input
              type="text"
              value={form.legalNameEn ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, legalNameEn: e.target.value, legalName: e.target.value.trim() || p.legalName }))}
              disabled={!editing}
              className={inputBase}
              placeholder="Company name (English)"
            />
          </div>
          <div>
            <label className={labelBase}>שם החברה (עברית)</label>
            <input
              type="text"
              value={form.legalNameHe ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, legalNameHe: e.target.value }))}
              disabled={!editing}
              className={inputBase}
              placeholder="שם החברה"
            />
          </div>
        </section>

        {/* Contact – Office Email & Phone (synced, appear on bilingual docs) */}
        <section className="rounded-sm bg-white border border-gray-100 p-5 space-y-4">
          <h2 className={sectionTitle}>Contact</h2>
          <p className="text-xs text-slate-500 mb-3">Office contact details; same value used for both languages on documents.</p>
          <div>
            <label className={labelBase}>Office Email / מייל משרד</label>
            <input
              type="email"
              value={form.officeEmail ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, officeEmail: e.target.value }))}
              disabled={!editing}
              className={inputBase}
              placeholder="office@company.com"
            />
          </div>
          <div>
            <label className={labelBase}>Office Phone / טלפון משרד</label>
            <input
              type="tel"
              value={form.officePhone ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, officePhone: e.target.value }))}
              disabled={!editing}
              className={inputBase}
              placeholder="+972 3 1234567"
            />
          </div>
        </section>

        {/* Address – structured */}
        <section className="rounded-sm bg-white border border-gray-100 p-5 space-y-4">
          <h2 className={sectionTitle}>Address &amp; delivery</h2>
          <p className="text-xs text-slate-500 mb-3">Structured address for documents in both languages.</p>
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">English</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={labelBase}>Street &amp; number</label>
                <input
                  type="text"
                  value={form.addressStreetEn ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, addressStreetEn: e.target.value }))}
                  disabled={!editing}
                  className={inputBase}
                  placeholder="Street & number"
                />
              </div>
              <div>
                <label className={labelBase}>City</label>
                <input
                  type="text"
                  value={form.addressCityEn ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, addressCityEn: e.target.value }))}
                  disabled={!editing}
                  className={inputBase}
                  placeholder="City"
                />
              </div>
              <div>
                <label className={labelBase}>Zip code</label>
                <input
                  type="text"
                  value={form.addressZipEn ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((p) => ({ ...p, addressZipEn: v, addressZipHe: v }));
                  }}
                  disabled={!editing}
                  className={inputBase}
                  placeholder="Zip"
                />
              </div>
              <div className="sm:col-span-3">
                <label className={labelBase}>Country</label>
                <input
                  type="text"
                  value={form.addressCountryEn ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, addressCountryEn: e.target.value }))}
                  disabled={!editing}
                  className={inputBase}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <h3 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">עברית</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={labelBase}>רחוב ומספר</label>
                <input
                  type="text"
                  value={form.addressStreetHe ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, addressStreetHe: e.target.value }))}
                  disabled={!editing}
                  className={inputBase}
                  placeholder="רחוב ומספר"
                />
              </div>
              <div>
                <label className={labelBase}>עיר</label>
                <input
                  type="text"
                  value={form.addressCityHe ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, addressCityHe: e.target.value }))}
                  disabled={!editing}
                  className={inputBase}
                  placeholder="עיר"
                />
              </div>
              <div>
                <label className={labelBase}>מיקוד</label>
                <input
                  type="text"
                  value={form.addressZipHe ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((p) => ({ ...p, addressZipHe: v, addressZipEn: v }));
                  }}
                  disabled={!editing}
                  className={inputBase}
                  placeholder="מיקוד"
                />
              </div>
              <div className="sm:col-span-3">
                <label className={labelBase}>מדינה</label>
                <input
                  type="text"
                  value={form.addressCountryHe ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, addressCountryHe: e.target.value }))}
                  disabled={!editing}
                  className={inputBase}
                  placeholder="מדינה"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bank details */}
        <section className="rounded-sm bg-white border border-gray-100 p-5 space-y-4">
          <h2 className={sectionTitle}>Bank details for payments</h2>
          <p className="text-xs text-slate-500 mb-3">Shown on tax invoices (חשבונית מס); not shown on receipts (קבלות).</p>
          <div>
            <label className={labelBase}>שם הבנק / Bank name</label>
            <input
              type="text"
              value={form.bankDetails?.bankName ?? ""}
              onChange={(e) => updateBankDetail("bankName", e.target.value)}
              disabled={!editing}
              className={inputBase}
              placeholder="Bank name"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>מספר סניף / Branch number</label>
              <input
                type="text"
                value={form.bankDetails?.branchNumber ?? ""}
                onChange={(e) => updateBankDetail("branchNumber", e.target.value)}
                disabled={!editing}
                className={inputBase}
                placeholder="Branch number"
              />
            </div>
            <div>
              <label className={labelBase}>מספר חשבון / Account number</label>
              <input
                type="text"
                value={form.bankDetails?.accountNumber ?? ""}
                onChange={(e) => updateBankDetail("accountNumber", e.target.value)}
                disabled={!editing}
                className={inputBase}
                placeholder="Account number"
              />
            </div>
          </div>
        </section>

        {/* Tax & Logo */}
        <section className="rounded-sm bg-white border border-gray-100 p-5 space-y-4">
          <h2 className={sectionTitle}>Tax &amp; Logo</h2>
          <div>
            <label className={labelBase}>Tax ID (ח.פ / ע.מ)</label>
            <input
              type="text"
              value={form.taxId}
              onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
              disabled={!editing}
              className={inputBase}
              placeholder="e.g. 512345678"
            />
          </div>
          <div>
            <label className={labelBase}>Logo</label>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            {editing ? (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-sm border border-gray-100 border-dashed bg-white text-slate-500 hover:border-[#008080]/40 hover:text-[#008080] text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                {form.businessLogo ? "Change logo" : "Upload logo"}
              </button>
            ) : null}
            {form.businessLogo && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.businessLogo} alt="Logo" className="max-h-16 object-contain rounded-sm border border-gray-100" />
              </div>
            )}
          </div>
        </section>

        {/* Signature Management */}
        {editing && (
          <section className="rounded-sm bg-white border border-gray-100 p-5 space-y-4">
            <h2 className={sectionTitle}>Signature management</h2>
            <div className="flex gap-0 p-0.5 rounded-sm border border-gray-100 bg-white" role="group">
              <button
                type="button"
                onClick={() => setSignatureMode("draw")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-sm font-semibold transition-all ${
                  signatureMode === "draw" ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-gray-50"
                }`}
              >
                <PenLine className="w-4 h-4" />
                Draw signature
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-sm font-semibold transition-all ${
                  signatureMode === "upload" ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-gray-50"
                }`}
              >
                <ImageUp className="w-4 h-4" />
                Upload signature
              </button>
            </div>
            {signatureMode === "upload" ? (
              <div className="space-y-3">
                <input ref={signatureUploadRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleSignatureUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => signatureUploadRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-sm border border-gray-100 border-dashed bg-white text-slate-500 hover:border-[#008080]/40 hover:text-[#008080] transition-colors"
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">PNG or JPG</span>
                </button>
                {form.signature && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Preview</p>
                    <div className="inline-block rounded-sm border border-gray-100 overflow-hidden bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.signature} alt="Signature preview" className="max-h-14 max-w-[180px] object-contain" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Draw your signature below. It will appear on PDF invoices.</p>
                <SignaturePad
                  onSave={handleSignatureSave}
                  savedSignatureDataUrl={form.signature || null}
                  useSavedSignature={useSavedSignature}
                  onUseSavedChange={setUseSavedSignature}
                  locale="en"
                  labelSign="Sign here"
                  labelUseSaved="Use saved signature"
                />
              </div>
            )}
          </section>
        )}

        {/* Document settings – language */}
        <section className="rounded-sm bg-white border border-gray-100 p-5 space-y-4">
          <h2 className={sectionTitle}>Document settings</h2>
          <p className="text-xs font-medium text-slate-600 mb-3">Document language preference</p>
          <div className="flex gap-0 p-0.5 rounded-sm border border-gray-100 bg-white" role="group">
            {(
              [
                { value: "he" as DocumentLanguagePreference, label: "Hebrew only" },
                { value: "en" as DocumentLanguagePreference, label: "English only" },
                { value: "bilingual" as DocumentLanguagePreference, label: "Bilingual (both)" },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => editing && setForm((p) => ({ ...p, documentLanguage: value }))}
                disabled={!editing}
                className={`flex-1 py-2.5 rounded-sm text-sm font-semibold transition-all ${
                  form.documentLanguage === value ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-gray-50"
                } ${!editing ? "opacity-90" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Document numbering – initial sequences */}
        <section className="rounded-sm bg-white border border-gray-100 p-5 space-y-4">
          <h2 className={sectionTitle}>Document numbering (initial sequences)</h2>
          <p className="text-xs text-slate-500 mb-3">Starting numbers for new document series. Edit at any time.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelBase}>Invoices</label>
              <input
                type="number"
                min={1}
                value={form.initialInvoiceNumber ?? 101}
                onChange={(e) => setForm((p) => ({ ...p, initialInvoiceNumber: Math.max(1, parseInt(e.target.value, 10) || 101) }))}
                disabled={!editing}
                className={inputBase}
              />
            </div>
            <div>
              <label className={labelBase}>Receipts</label>
              <input
                type="number"
                min={1}
                value={form.initialReceiptNumber ?? 101}
                onChange={(e) => setForm((p) => ({ ...p, initialReceiptNumber: Math.max(1, parseInt(e.target.value, 10) || 101) }))}
                disabled={!editing}
                className={inputBase}
              />
            </div>
            <div>
              <label className={labelBase}>Quotes</label>
              <input
                type="number"
                min={1}
                value={form.initialQuoteNumber ?? 101}
                onChange={(e) => setForm((p) => ({ ...p, initialQuoteNumber: Math.max(1, parseInt(e.target.value, 10) || 101) }))}
                disabled={!editing}
                className={inputBase}
              />
            </div>
            <div>
              <label className={labelBase}>תעודות משלוח / Delivery notes</label>
              <input
                type="number"
                min={1}
                value={form.initialDeliveryNoteNumber ?? 101}
                onChange={(e) => setForm((p) => ({ ...p, initialDeliveryNoteNumber: Math.max(1, parseInt(e.target.value, 10) || 101) }))}
                disabled={!editing}
                className={inputBase}
              />
            </div>
          </div>
        </section>

        {/* Live preview – fully bound to Document Language; updates instantly */}
        <section className="rounded-sm bg-white border border-gray-100 overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100">
            <h2 className={sectionTitle + " mb-0"}>Sample document preview</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Bound to Document Language setting · Updates instantly as you change options above.</p>
          </div>
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Document type</span>
            <div className="flex gap-0 p-0.5 rounded-sm border border-gray-100 bg-white" role="group" aria-label="Document type">
              <button
                type="button"
                onClick={() => setPreviewDocType("invoice")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-semibold transition-all ${
                  previewDocType === "invoice" ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-gray-50"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Invoice
              </button>
              <button
                type="button"
                onClick={() => setPreviewDocType("receipt")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-semibold transition-all ${
                  previewDocType === "receipt" ? "bg-[#008080] text-white" : "text-slate-600 hover:bg-gray-50"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Receipt
              </button>
            </div>
          </div>
          <div className="p-5">
            <div
              className={`max-w-md mx-auto bg-white rounded-sm border border-gray-100 p-6 text-sm ${lang === "bilingual" ? "text-left" : isRTL ? "text-right" : "text-left"}`}
              dir={lang === "bilingual" ? "ltr" : isRTL ? "rtl" : "ltr"}
            >
              {form.businessLogo ? (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.businessLogo} alt="Logo" className="max-h-12 max-w-[180px] object-contain" />
                </div>
              ) : (
                <div className="mb-4 h-10 flex items-center">
                  <span className="text-slate-400 text-xs font-medium">Logo placeholder</span>
                </div>
              )}
              {lang === "bilingual" ? (
                <>
                  <div className="border-b border-gray-100 pb-3 mb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">English</p>
                    <p className="font-semibold text-gray-900">{form.legalNameEn || form.legalName || "Company name (EN)"}</p>
                    {form.taxId && <p className="text-gray-600 text-xs">Tax ID: {form.taxId}</p>}
                    {previewAddrEn && <p className="text-gray-600 text-xs">{previewAddrEn}</p>}
                    {(form.officeEmail || form.officePhone) && (
                      <p className="text-gray-600 text-xs mt-0.5">
                        {form.officeEmail}
                        {form.officeEmail && form.officePhone ? " · " : ""}
                        {form.officePhone}
                      </p>
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">עברית</p>
                    <p className="font-semibold text-gray-900">{form.legalNameHe || form.legalName || "—"}</p>
                    {form.taxId && <p className="text-gray-600 text-xs">ח.פ/ע.מ: {form.taxId}</p>}
                    {previewAddrHe && <p className="text-gray-600 text-xs">{previewAddrHe}</p>}
                    {(form.officeEmail || form.officePhone) && (
                      <p className="text-gray-600 text-xs mt-0.5">
                        {form.officeEmail}
                        {form.officeEmail && form.officePhone ? " · " : ""}
                        {form.officePhone}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-slate-500 text-xs font-medium">
                      {previewDocType === "invoice" ? `Tax invoice / חשבונית מס #${form.initialInvoiceNumber ?? 101}` : `Receipt / קבלה #${form.initialReceiptNumber ?? 101}`}
                    </p>
                    <p className="text-slate-500 text-xs font-medium mt-1">Client / לקוח: Sample Client Ltd</p>
                    <p className="text-slate-500 text-xs font-medium">Date / תאריך: {new Date().toISOString().slice(0, 10)}</p>
                    <table className="w-full mt-3 text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1.5 font-semibold text-gray-600">Description / תיאור</th>
                          <th className="text-right py-1.5 font-semibold text-gray-600">Amount / סכום</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-1.5 text-gray-700 font-medium">Sample item / פריט לדוגמה</td>
                          <td className="py-1.5 text-right tabular-nums">1,200.00</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-right font-semibold text-gray-900 mt-2">Total / סה״כ: 1,200.00</p>
                    {showBankInPreview && (form.bankDetails?.bankName || form.bankDetails?.branchNumber || form.bankDetails?.accountNumber) && (
                      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-2">
                        <p className="font-semibold text-gray-700">Bank details for payment / פרטי בנק לתשלום</p>
                        {form.bankDetails?.bankName && <p>{form.bankDetails.bankName}</p>}
                        {(form.bankDetails?.branchNumber || form.bankDetails?.accountNumber) && (
                          <p>{[form.bankDetails?.branchNumber, form.bankDetails?.accountNumber].filter(Boolean).join(" / ")}</p>
                        )}
                      </div>
                    )}
                    {form.signature && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-[10px] text-slate-500 font-medium mb-1">Authorized signature / חתימה</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.signature} alt="Signature" className="max-h-14 max-w-[160px] object-contain" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-900">
                    {showEn ? (form.legalNameEn || form.legalName || "Company name (EN)") : (form.legalNameHe || form.legalName || "שם החברה")}
                  </p>
                  {form.taxId && <p className="text-gray-600 text-xs">{isRTL ? "ח.פ/ע.מ" : "Tax ID"}: {form.taxId}</p>}
                  {showEn && previewAddrEn && <p className="text-gray-600 text-xs mt-0.5">{previewAddrEn}</p>}
                  {showHe && previewAddrHe && <p className="text-gray-600 text-xs">{previewAddrHe}</p>}
                  {(form.officeEmail || form.officePhone) && (
                    <p className="text-gray-600 text-xs mt-0.5">
                      {form.officeEmail}
                      {form.officeEmail && form.officePhone ? " · " : ""}
                      {form.officePhone}
                    </p>
                  )}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-slate-500 text-xs font-medium">
                      {previewDocType === "invoice" ? (isRTL ? "חשבונית מס" : "Tax invoice") : isRTL ? "קבלה" : "Receipt"} #{previewDocType === "invoice" ? form.initialInvoiceNumber ?? 101 : form.initialReceiptNumber ?? 101}
                    </p>
                    <p className="text-slate-500 text-xs font-medium">{isRTL ? "לקוח" : "Client"}: Sample Client Ltd</p>
                    <p className="text-slate-500 text-xs font-medium">{isRTL ? "תאריך" : "Date"}: {new Date().toISOString().slice(0, 10)}</p>
                    <table className="w-full mt-3 text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className={`py-1.5 font-semibold text-gray-600 ${isRTL ? "text-right" : "text-left"}`}>{isRTL ? "תיאור" : "Description"}</th>
                          <th className="text-right py-1.5 font-semibold text-gray-600">{isRTL ? "סכום" : "Amount"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className={`py-1.5 text-gray-700 font-medium ${isRTL ? "text-right" : "text-left"}`}>{isRTL ? "פריט לדוגמה" : "Sample item"}</td>
                          <td className="py-1.5 text-right tabular-nums">1,200.00</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-right font-semibold text-gray-900 mt-2">{isRTL ? "סה״כ" : "Total"}: 1,200.00</p>
                    {showBankInPreview && (form.bankDetails?.bankName || form.bankDetails?.branchNumber || form.bankDetails?.accountNumber) && (
                      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
                        <p className="font-semibold text-gray-700 mb-1">{isRTL ? "פרטי בנק לתשלום" : "Bank details for payment"}</p>
                        {form.bankDetails?.bankName && <p>{form.bankDetails.bankName}</p>}
                        {(form.bankDetails?.branchNumber || form.bankDetails?.accountNumber) && (
                          <p>{[form.bankDetails?.branchNumber, form.bankDetails?.accountNumber].filter(Boolean).join(" / ")}</p>
                        )}
                      </div>
                    )}
                    {form.signature && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-[10px] text-slate-500 font-medium mb-1">{isRTL ? "חתימה" : "Authorized signature"}</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.signature} alt="Signature" className="max-h-14 max-w-[160px] object-contain" />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
