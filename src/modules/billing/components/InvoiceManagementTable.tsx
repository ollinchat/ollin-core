"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Share2,
  Copy,
  RotateCcw,
  CopyPlus,
  ChevronLeft,
  Banknote,
  Plus,
} from "lucide-react";
import { useBilling } from "@/contexts/BillingContext";
import { NewInvoiceModal } from "./NewInvoiceModal";
import type { BillingDocument, BillingDocStatus } from "@/modules/billing/types";

const STATUS_LABELS: Record<BillingDocStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  paid: "Paid",
  canceled: "Canceled",
  invoiced: "Invoiced",
};

const TYPE_LABELS: Record<string, string> = {
  draft: "Draft",
  quote: "Quote",
  invoice: "Invoice",
  receipt: "Receipt",
  credit_note: "Credit Note",
};

export function InvoiceManagementTable() {
  const {
    documents,
    refreshDocuments,
    downloadPdf,
    getShareLink,
    duplicateDoc,
    issueCreditNote,
    markPaid,
    convertToQuote,
    convertQuoteToInvoice,
  } = useBilling();
  const [copyId, setCopyId] = useState<string | null>(null);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);

  const handleCopyLink = (docId: string) => {
    const link = getShareLink(docId);
    navigator.clipboard.writeText(link);
    setCopyId(docId);
    setTimeout(() => setCopyId(null), 2000);
  };

  const invoicesAndQuotes = documents.filter(
    (d) => d.type === "invoice" || d.type === "quote" || d.type === "draft"
  );

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Invoices & Quotes</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNewInvoiceOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#008080" }}
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#008080]"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Link>
          </div>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Number</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600">Total</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoicesAndQuotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No invoices or quotes yet. Create one from chat (Send Invoice) or from Billing.
                </td>
              </tr>
            ) : (
              invoicesAndQuotes.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-mono text-gray-900">{doc.number}</td>
                  <td className="px-4 py-2.5 text-gray-700">{TYPE_LABELS[doc.type] ?? doc.type}</td>
                  <td className="px-4 py-2.5 text-gray-700">{doc.clientName}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        doc.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : doc.status === "canceled"
                            ? "bg-red-100 text-red-800"
                            : doc.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABELS[doc.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                    {doc.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {doc.type === "draft" && (
                        <button
                          type="button"
                          onClick={() => convertToQuote(doc.id)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#008080]"
                          title="Convert to Quote"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      {doc.type === "quote" && (
                        <button
                          type="button"
                          onClick={() => convertQuoteToInvoice(doc.id)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600"
                          title="Convert to Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadPdf(doc.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#008080]"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(doc.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#008080]"
                        title="Share link"
                      >
                        {copyId === doc.id ? (
                          <span className="text-xs text-green-600">Copied</span>
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                      {doc.type === "invoice" && doc.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => markPaid(doc.id)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600"
                          title="Mark paid"
                        >
                          <Banknote className="w-4 h-4" />
                        </button>
                      )}
                      {doc.type === "invoice" && doc.status !== "draft" && doc.status !== "canceled" && (
                        <button
                          type="button"
                          onClick={() => issueCreditNote(doc.id)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600"
                          title="Issue Credit Note"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => duplicateDoc(doc.id)}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#008080]"
                        title="Duplicate"
                      >
                        <CopyPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      <NewInvoiceModal
        open={newInvoiceOpen}
        onClose={() => setNewInvoiceOpen(false)}
        onSuccess={refreshDocuments}
      />
    </>
  );
}
