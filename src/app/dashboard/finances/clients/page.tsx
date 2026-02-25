"use client";

import { useState } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { ChevronLeft, Users, Plus, Building2, User } from "lucide-react";
import type { ClientType } from "@/lib/finance-types";

export default function ClientsPage() {
  const { clients, addClient } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clientType, setClientType] = useState<ClientType>("private");
  const [vatId, setVatId] = useState("");
  const [address, setAddress] = useState("");

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;
    addClient({
      name: trimmedName,
      email: trimmedEmail,
      clientType,
      vatId: vatId.trim() || undefined,
      address: address.trim() || undefined,
    });
    setName("");
    setEmail("");
    setClientType("private");
    setVatId("");
    setAddress("");
    setShowForm(false);
  };

  const companies = clients.filter((c) => (c.clientType ?? "private") === "company");
  const privateClients = clients.filter((c) => (c.clientType ?? "private") === "private");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/95">
        <Link href="/dashboard" className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          Back
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Clients
        </h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="p-2.5 rounded-2xl bg-accent text-white hover:shadow-glow-subtle"
          aria-label="Add client"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>
      <div className="flex-1 p-4 space-y-6">
        {showForm && (
          <div className="rounded-2xl bg-white shadow-soft p-4 space-y-3 border-0">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Type</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setClientType("company")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium ${clientType === "company" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                  <Building2 className="w-4 h-4" />
                  Company
                </button>
                <button type="button" onClick={() => setClientType("private")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium ${clientType === "private" ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                  <User className="w-4 h-4" />
                  Private
                </button>
              </div>
            </div>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
            <input type="text" value={vatId} onChange={(e) => setVatId(e.target.value)} placeholder="VAT ID (optional)" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">Cancel</button>
              <button type="button" onClick={handleAdd} className="flex-1 py-2.5 rounded-xl bg-accent text-white font-medium">Add</button>
            </div>
          </div>
        )}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            Companies
          </h2>
          <div className="space-y-2">
            {companies.length === 0 && <p className="text-xs text-gray-400 py-3 rounded-xl bg-gray-50 text-center">No companies</p>}
            {companies.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white shadow-soft px-4 py-3 border border-gray-100">
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-500">{c.email}</p>
                {(c.vatId || c.address) && <p className="text-xs text-gray-400 mt-1">{[c.vatId, c.address].filter(Boolean).join(" · ")}</p>}
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-teal-600" />
            Private Clients
          </h2>
          <div className="space-y-2">
            {privateClients.length === 0 && <p className="text-xs text-gray-400 py-3 rounded-xl bg-gray-50 text-center">No private clients</p>}
            {privateClients.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white shadow-soft px-4 py-3 border border-gray-100">
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-500">{c.email}</p>
                {(c.vatId || c.address) && <p className="text-xs text-gray-400 mt-1">{[c.vatId, c.address].filter(Boolean).join(" · ")}</p>}
              </div>
            ))}
          </div>
        </section>
        <div className="flex gap-2">
          <Link href="/dashboard/finances/company-profile" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">Company profile</Link>
          <Link href="/dashboard/finances/documents" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">Documents</Link>
        </div>
      </div>
    </div>
  );
}
