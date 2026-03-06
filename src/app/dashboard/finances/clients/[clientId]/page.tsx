"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useBilling } from "@/contexts/BillingContext";
import { useContacts } from "@/contexts/ContactsContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { ChevronLeft, User, Pencil, Check, X, Trash2, FileText } from "lucide-react";

const TEAL = "#008080";

type MergedClient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  source: "billing" | "contact";
};

function docTypeLabel(t: string): string {
  if (t === "invoice") return "Invoice";
  if (t === "quote") return "Quote";
  if (t === "receipt") return "Receipt";
  if (t === "delivery_note") return "Delivery Note";
  if (t === "credit_note") return "Credit Note";
  return t;
}

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = typeof params.clientId === "string" ? params.clientId : "";
  const { clients: billingClients, updateClient, removeClient, documents } = useBilling();
  const { contacts } = useContacts();
  const { getConversationsWithMeta, currentUserId } = useInternalMessages();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", taxId: "" });

  const chatList = useMemo(() => getConversationsWithMeta(currentUserId), [getConversationsWithMeta, currentUserId]);

  const mergedClients = useMemo(() => {
    const byId = new Map<string, MergedClient>();
    billingClients.forEach((c) =>
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        taxId: c.taxId,
        source: "billing",
      })
    );
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
      byId.set(key, {
        id: key,
        name: c.name ?? key,
        email: c.email,
        phone: c.phone,
        source: "contact",
      });
    });
    return Array.from(byId.values());
  }, [billingClients, chatList, contacts]);

  const client = useMemo(
    () => mergedClients.find((c) => c.id === clientId) ?? null,
    [mergedClients, clientId]
  );

  const startEdit = useCallback(() => {
    if (!client) return;
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      taxId: client.taxId ?? "",
    });
    setEditing(true);
  }, [client]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const saveEdit = useCallback(() => {
    if (!client || client.source !== "billing") return;
    updateClient(client.id, {
      name: form.name.trim() || client.name,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
    });
    setEditing(false);
  }, [client, form, updateClient]);

  const handleDelete = useCallback(() => {
    if (!client || client.source !== "billing") return;
    if (typeof window === "undefined" || !window.confirm(`Delete client "${client.name}"? This cannot be undone.`)) return;
    removeClient(client.id);
    router.push("/dashboard/finances/clients");
  }, [client, removeClient, router]);

  const clientDocuments = useMemo(
    () => documents.filter((d) => d.clientId === clientId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [documents, clientId]
  );

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc]">
        <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white shadow-sm">
          <Link
            href="/dashboard/finances/clients"
            className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </header>
        <div className="flex-1 p-4 flex items-center justify-center">
          <p className="text-gray-500">Client not found.</p>
        </div>
      </div>
    );
  }

  const isBilling = client.source === "billing";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans antialiased">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white shadow-sm">
        <Link
          href="/dashboard/finances/clients"
          className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: TEAL }} />
          {client.name}
        </h1>
        {isBilling && !editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-[13px] font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 p-4 max-w-xl mx-auto w-full">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Client details</h2>
          </div>
          <div className="p-4 space-y-4">
            {editing && isBilling ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tax ID / H.P</label>
                  <input
                    value={form.taxId}
                    onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: TEAL }}
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Name</p>
                  <p className="text-sm text-gray-900 mt-0.5">{client.name}</p>
                </div>
                {client.taxId != null && client.taxId !== "" && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Tax ID / H.P</p>
                    <p className="text-sm text-gray-900 mt-0.5">{client.taxId}</p>
                  </div>
                )}
                {(client.address != null && client.address !== "") && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Address</p>
                    <p className="text-sm text-gray-900 mt-0.5">{client.address}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Contact</p>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {[client.email, client.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {client.source === "contact" && (
                  <p className="text-xs text-gray-400 pt-2">From contacts. Add as billing client to edit details.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Activity: documents for this client */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Activity</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Documents associated with this client</p>
          </div>
          <div className="overflow-x-auto">
            {clientDocuments.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">No documents yet.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Type</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Number</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Date</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">Amount</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientDocuments.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-700">{docTypeLabel(d.type)}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">#{d.number}</td>
                      <td className="px-4 py-2 text-gray-600">{d.date || "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium">{(d.total ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${(d.status as string) === "paid" ? "bg-green-100 text-green-700" : (d.status as string) === "canceled" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>
                          {(d.status as string) || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {clientDocuments.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/30">
              <Link
                href="/dashboard/finances/documents"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                <FileText className="w-3.5 h-3.5" />
                View all documents
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
