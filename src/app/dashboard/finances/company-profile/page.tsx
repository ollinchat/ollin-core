"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { ChevronLeft, Building2, Save, Upload } from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";
import type { DealerType } from "@/lib/finance-types";

export default function CompanyProfilePage() {
  const { companyProfile, setCompanyProfile } = useFinance();
  const [nameEn, setNameEn] = useState("");
  const [nameHe, setNameHe] = useState("");
  const [vatId, setVatId] = useState("");
  const [address, setAddress] = useState("");
  const [dealerType, setDealerType] = useState<DealerType>("authorized");
  const [vatRate, setVatRate] = useState(18);
  const [saved, setSaved] = useState(false);
  const [useSavedSignature, setUseSavedSignature] = useState(!!companyProfile.signature);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameEn(companyProfile.nameEn ?? companyProfile.name ?? "");
    setNameHe(companyProfile.nameHe ?? "");
    setVatId(companyProfile.vatId ?? "");
    setAddress(companyProfile.address ?? "");
    setDealerType(companyProfile.dealerType ?? "authorized");
    setVatRate(companyProfile.vatRate ?? 18);
    setUseSavedSignature(!!companyProfile.signature);
  }, [companyProfile]);

  const handleSave = () => {
    setCompanyProfile({
      ...companyProfile,
      name: nameEn || nameHe || companyProfile.name,
      nameEn: nameEn || undefined,
      nameHe: nameHe || undefined,
      vatId,
      address,
      dealerType,
      vatRate,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignatureSave = (dataUrl: string) => {
    setCompanyProfile({ ...companyProfile, signature: dataUrl });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCompanyProfile({ ...companyProfile, logo: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white">
        <Link href="/dashboard/finances" className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          Back
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#008080]" />
          Account Settings
        </h1>
      </header>
      <div className="flex-1 p-4 space-y-4">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Company</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name (English)</label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080]"
              placeholder="Company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם החברה (עברית)</label>
            <input
              type="text"
              value={nameHe}
              onChange={(e) => setNameHe(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080]"
              placeholder="שם החברה"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Authorized dealer type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDealerType("authorized")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${dealerType === "authorized" ? "bg-[#008080] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                עוסק מורשה
              </button>
              <button
                type="button"
                onClick={() => setDealerType("exempt")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${dealerType === "exempt" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                עוסק פטור
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
            <input
              type="text"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080]"
              placeholder="e.g. 51xxxxxx-x"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#008080]/30 focus:border-[#008080] resize-none"
              placeholder="Business address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VAT % (default for new documents)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={vatRate}
                onChange={(e) => setVatRate(parseFloat(e.target.value) || 18)}
                className="w-24 rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-600 hover:border-[#008080]/40 hover:text-[#008080] text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              {companyProfile.logo ? "Change logo" : "Upload logo"}
            </button>
            {companyProfile.logo && (
              <img src={companyProfile.logo} alt="Logo" className="mt-2 h-16 object-contain rounded-lg border border-gray-200" />
            )}
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
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Digital signature (for PDFs)</h3>
          <SignaturePad
            onSave={handleSignatureSave}
            savedSignatureDataUrl={companyProfile.signature ?? null}
            useSavedSignature={useSavedSignature}
            onUseSavedChange={setUseSavedSignature}
            locale="en"
            labelSign="Sign here"
            labelUseSaved="Use saved signature"
          />
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/finances/settings" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Document Numbering
          </Link>
          <Link href="/dashboard/finances/documents" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
}
