"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  User,
  FileText,
  Lock,
  Shield,
} from "lucide-react";
import { useBilling } from "@/contexts/BillingContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { useContacts } from "@/contexts/ContactsContext";
import type { BillingClient, BillingLineItem } from "@/modules/billing/types";

const TEAL = "#008080";

type NewInvoiceModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const emptyLineItem = (): BillingLineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unitPrice: 0,
});

export function NewInvoiceModal({ open, onClose, onSuccess }: NewInvoiceModalProps) {
  const { createDraft, convertToQuote, convertQuoteToInvoice, downloadPdf } = useBilling();
  const { getConversationsWithMeta, currentUserId } = useInternalMessages();
  const { contacts } = useContacts();

  const [selectedClient, setSelectedClient] = useState<BillingClient | null>(null);
  const [lineItems, setLineItems] = useState<BillingLineItem[]>([emptyLineItem()]);
  const [protectWithPassword, setProtectWithPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatList = useMemo(() => getConversationsWithMeta(currentUserId), [getConversationsWithMeta, currentUserId]);

  const clientOptions = useMemo(() => {
    const byId = new Map<string, BillingClient>();
    for (const { contactId } of chatList) {
      if (byId.has(contactId)) continue;
      const contact = contacts.find((c) => c.id === contactId || c.phone === contactId);
      byId.set(contactId, {
        id: contactId,
        name: contact?.name ?? contactId,
        email: contact?.email,
        phone: contact?.phone,
      });
    }
    return Array.from(byId.values());
  }, [chatList, contacts]);

  const addLine = useCallback(() => {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.id !== id)));
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<BillingLineItem>) => {
    setLineItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  }, []);

  const validItems = useMemo(() => {
    return lineItems.filter((i) => i.description.trim() || i.quantity > 0 || i.unitPrice > 0);
  }, [lineItems]);

  const handleFinalize = useCallback(async () => {
    setError(null);
    if (!selectedClient) {
      setError("Please select a client.");
      return;
    }
    const items = validItems.length > 0 ? validItems : [emptyLineItem()];
    const normalized = items.map((i) => ({
      ...i,
      id: i.id || crypto.randomUUID(),
      description: i.description.trim() || "Item",
      quantity: Math.max(0, Number(i.quantity)),
      unitPrice: Math.max(0, Number(i.unitPrice)),
    }));

    setIsSubmitting(true);
    try {
      const draft = createDraft(selectedClient, normalized);
      if (!draft) {
        setError("Could not create draft. Are you signed in?");
        return;
      }
      const quote = convertToQuote(draft.id);
      if (!quote) {
        setError("Could not create quote.");
        return;
      }
      const invoice = convertQuoteToInvoice(quote.id);
      if (!invoice) {
        setError("Could not finalize invoice.");
        return;
      }
      await downloadPdf(invoice.id, {
        password: protectWithPassword && password ? password : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedClient,
    validItems,
    protectWithPassword,
    password,
    createDraft,
    convertToQuote,
    convertQuoteToInvoice,
    downloadPdf,
    onSuccess,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      setError(null);
      setSelectedClient(null);
      setLineItems([emptyLineItem()]);
      setProtectWithPassword(false);
      setPassword("");
      onClose();
    }
  }, [isSubmitting, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">New Invoice</h2>
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Client Selection */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <User className="w-4 h-4" />
            Client (from chat list)
          </h3>
          <select
            value={selectedClient?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const client = clientOptions.find((c) => c.id === id) ?? null;
              setSelectedClient(client);
            }}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/20"
          >
            <option value="">Select a client…</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.email ? `(${c.email})` : ""}
              </option>
            ))}
          </select>
          {clientOptions.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">Start a chat to see clients here.</p>
          )}
        </section>

        {/* Line Items */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="w-4 h-4" />
              Line Items
            </h3>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 text-sm font-medium text-[#008080] hover:text-[#006666]"
            >
              <Plus className="w-4 h-4" /> Add line
            </button>
          </div>
          <div className="space-y-3">
            {lineItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-center rounded-xl border border-gray-100 bg-gray-50/50 p-3"
              >
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateLine(item.id, { description: e.target.value })}
                  placeholder="Description"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={item.quantity}
                  onChange={(e) => updateLine(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="Qty"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unitPrice}
                  onChange={(e) => updateLine(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="Price"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeLine(item.id)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove line"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Protect with Password */}
        <section className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={protectWithPassword}
              onChange={(e) => setProtectWithPassword(e.target.checked)}
              className="rounded border-gray-300 text-[#008080] focus:ring-[#008080]"
            />
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Shield className="w-4 h-4" />
              Protect with Password
            </span>
          </label>
          {protectWithPassword && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PDF password (optional)"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          )}
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Finalize & Sign */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleFinalize}
            disabled={isSubmitting || !selectedClient}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-white font-semibold shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ backgroundColor: TEAL }}
          >
            <Lock className="w-5 h-5" />
            {isSubmitting ? "Finalizing…" : "Finalize & Sign"}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Locks the document and downloads the PDF. No further edits after signing.
          </p>
        </div>
      </main>
    </div>
  );
}
