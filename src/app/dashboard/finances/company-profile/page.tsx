"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { ChevronLeft, Building2, Save } from "lucide-react";
import { SignaturePad } from "@/components/ui/SignaturePad";

export default function CompanyProfilePage() {
  const { companyProfile, setCompanyProfile } = useFinance();
  const [name, setName] = useState("");
  const [vatId, setVatId] = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [useSavedSignature, setUseSavedSignature] = useState(!!companyProfile.signature);

  useEffect(() => {
    setName(companyProfile.name);
    setVatId(companyProfile.vatId);
    setAddress(companyProfile.address);
    setUseSavedSignature(!!companyProfile.signature);
  }, [companyProfile.name, companyProfile.vatId, companyProfile.address, companyProfile.signature]);

  const handleSave = () => {
    setCompanyProfile({ ...companyProfile, name, vatId, address });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignatureSave = (dataUrl: string) => {
    setCompanyProfile({ ...companyProfile, signature: dataUrl });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/95">
        <Link href="/dashboard" className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          Back
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-accent" />
          Company Profile
        </h1>
      </header>
      <div className="flex-1 p-4 space-y-4">
        <div className="rounded-2xl bg-white shadow-soft p-4 space-y-4 border-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-accent/30 focus:border-accent"
              placeholder="Your company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VAT ID</label>
            <input
              type="text"
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-accent/30 focus:border-accent"
              placeholder="e.g. 51xxxxxx-x"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-accent/30 focus:border-accent resize-none"
              placeholder="Business address"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-white font-medium shadow-soft hover:shadow-glow-subtle transition-shadow"
          >
            <Save className="w-5 h-5" />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
        <div className="rounded-2xl bg-white shadow-soft p-4 border-0">
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
          <Link href="/dashboard/finances/clients" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Clients
          </Link>
          <Link href="/dashboard/finances/documents" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Documents
          </Link>
        </div>
      </div>
    </div>
  );
}
