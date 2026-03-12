"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBilling } from "@/contexts/BillingContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { ChevronLeft, Users, Plus } from "lucide-react";
import { AddClientModal } from "@/components/finances/AddClientModal";

const TEAL = "#008080";

export default function ClientsPage() {
  const router = useRouter();
  const { clients: billingClients, addClient } = useBilling();
  const { contacts } = useContacts();
  const { getConversationsWithMeta, currentUserId } = useInternalMessages();
  const [showAddModal, setShowAddModal] = useState(false);

  const goToProfile = useCallback((clientId: string) => {
    router.push(`/dashboard/finances/clients/${encodeURIComponent(clientId)}`);
  }, [router]);

  const chatList = useMemo(() => getConversationsWithMeta(currentUserId), [getConversationsWithMeta, currentUserId]);

  const mergedClients = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; email?: string; phone?: string; address?: string; taxId?: string; source: "billing" | "contact" }>();
    billingClients.forEach((c) => byId.set(c.id, { id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address, taxId: c.taxId, source: "billing" }));
    chatList.forEach((x: { contactId: string }) => {
      const contactId = x.contactId;
      if (byId.has(contactId)) return;
      const contact = contacts.find((c) => c.id === contactId || c.phone === contactId);
      byId.set(contactId, {
        id: contactId,
        name: contact?.name ?? contactId,
        email: contact?.email,
        phone: contact?.phone,
        source: "contact",
      });
    });
    contacts.forEach((c) => {
      const key = c.id || c.phone || "";
      if (!key || byId.has(key)) return;
      byId.set(key, { id: key, name: c.name ?? key, email: c.email, phone: c.phone, source: "contact" });
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [billingClients, chatList, contacts]);

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
          <Users className="w-5 h-5" style={{ color: TEAL }} />
          Clients
        </h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          + Add New Client
        </button>
      </header>

      <div className="flex-1 p-4">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">All clients</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Click a row to open the client profile</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Tax ID</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Contact</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Source</th>
                </tr>
              </thead>
              <tbody>
                {mergedClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500">No clients yet. Add one to get started.</td>
                  </tr>
                ) : (
                  mergedClients.map((c) => (
                    <tr
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => goToProfile(c.id)}
                      onKeyDown={(e) => e.key === "Enter" && goToProfile(c.id)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{c.taxId || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap truncate max-w-[140px]">{c.email || c.phone || "—"}</td>
                      <td className="px-4 py-2.5">
                        {c.source === "billing" ? (
                          <span className="text-gray-600">Billing</span>
                        ) : (
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Contact</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link href="/dashboard/finances/documents" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-[13px] hover:bg-gray-200">
            Documents
          </Link>
          <Link href="/dashboard/finances/business-settings" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-[13px] hover:bg-gray-200">
            Business Settings
          </Link>
        </div>
      </div>

      <AddClientModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
