"use client";

import React, { useState, useEffect } from "react";
import { X, Building2, Upload } from "lucide-react";
import { useBilling } from "@/contexts/BillingContext";

const TEAL = "#008080";

export function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { businessProfile, setBusinessProfile } = useBilling();
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [businessLogo, setBusinessLogo] = useState("");
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [bitLink, setBitLink] = useState("");

  useEffect(() => {
    if (!open) return;
    setLegalName(businessProfile?.legalName ?? "");
    setTaxId(businessProfile?.taxId ?? "");
    setAddress(businessProfile?.address ?? "");
    setBusinessLogo(businessProfile?.businessLogo ?? "");
    setIban(businessProfile?.bankDetails?.iban ?? "");
    setSwift(businessProfile?.bankDetails?.swift ?? "");
    setBitLink(businessProfile?.bankDetails?.bitLink ?? "");
  }, [open, businessProfile]);

  const handleSave = () => {
    setBusinessProfile({
      legalName: legalName.trim(),
      taxId: taxId.trim(),
      address: address.trim(),
      businessLogo,
      bankDetails: {
        iban: iban.trim() || undefined,
        swift: swift.trim() || undefined,
        bitLink: bitLink.trim() || undefined,
      },
    });
    onClose();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBusinessLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" style={{ color: TEAL }} />
            Edit Business Profile
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Legal name</label>
            <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (H.P / E.M)</label>
            <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                {businessLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={businessLogo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IBAN (optional)</label>
            <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT (optional)</label>
            <input type="text" value={swift} onChange={(e) => setSwift(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bit / Payment link (optional)</label>
            <input type="text" value={bitLink} onChange={(e) => setBitLink(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">Cancel</button>
          <button type="button" onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-white font-medium" style={{ backgroundColor: TEAL }}>Save</button>
        </div>
      </div>
    </div>
  );
}
