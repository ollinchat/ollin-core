"use client";

import React, { useState } from "react";
import { X, User } from "lucide-react";
import { useBilling } from "@/contexts/BillingContext";

const TEAL = "#008080";

export function AddClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addClient } = useBilling();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;
    addClient({
      name: trimmedName,
      email: trimmedEmail,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      taxId: taxId.trim() || undefined,
    });
    setName("");
    setEmail("");
    setPhone("");
    setTaxId("");
    setAddress("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5" style={{ color: TEAL }} />
            Add New Client
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (optional)</label>
            <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">
            Cancel
          </button>
          <button type="button" onClick={handleAdd} disabled={!name.trim() || !email.trim()} className="flex-1 py-2.5 rounded-xl text-white font-medium disabled:opacity-50" style={{ backgroundColor: TEAL }}>
            Add Client
          </button>
        </div>
      </div>
    </div>
  );
}
