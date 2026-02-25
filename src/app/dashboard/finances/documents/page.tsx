"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import type { FinanceClient } from "@/lib/finance-types";
import { ChevronLeft, FileText, Receipt, FileStack, ArrowRightCircle, Plus, FileDown } from "lucide-react";

function openInvoicePdf(inv: { number: string; clientName: string; amount: string; description: string; date: string }, companyName: string, signatureDataUrl?: string) {
  const signatureHtml = signatureDataUrl
    ? `<div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;"><p style="font-size:0.75rem;color:#6b7280;">Authorized signature</p><img src="${signatureDataUrl}" alt="Signature" style="max-width:180px;height:auto;" /></div>`
    : "";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${inv.number}</title><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto;} h1{color:#0d9488;} table{width:100%;border-collapse:collapse;} th,td{border-bottom:1px solid #eee;padding:8px 0;} th{text-align:left;color:#6b7280;font-weight:500;}</style></head><body><h1>Tax Invoice</h1><p style="color:#6b7280;">Invoice #${inv.number}</p><p><strong>${companyName}</strong></p><table><tr><th>Client</th><td>${inv.clientName}</td></tr><tr><th>Amount</th><td>${inv.amount}</td></tr><tr><th>Date</th><td>${inv.date}</td></tr><tr><th>Description</th><td>${inv.description || "—"}</td></tr></table>${signatureHtml}</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

function getClientType(clients: FinanceClient[], clientId: string): "company" | "private" | "other" {
  const c = clients.find((x) => x.id === clientId);
  if (c?.clientType === "private") return "private";
  if (c?.clientType === "company") return "company";
  return "other";
}

export default function DocumentsPage() {
  const { companyProfile, clients, quotes, invoices, addQuote, convertQuoteToInvoice, cancelInvoice } = useFinance();
  const [activeTab, setActiveTab] = useState<"quotes" | "invoices">("quotes");
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [quoteClientId, setQuoteClientId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const companies = useMemo(() => clients.filter((c) => c.clientType === "company" || !c.clientType), [clients]);
  const privateClients = useMemo(() => clients.filter((c) => c.clientType === "private"), [clients]);

  const handleNewQuote = () => {
    const client = clients.find((c) => c.id === quoteClientId);
    if (!client || !quoteAmount.trim()) return;
    addQuote({
      clientId: client.id,
      clientName: client.name,
      amount: quoteAmount.trim(),
      description: quoteDesc.trim(),
      date: new Date().toISOString().slice(0, 10),
    });
    setQuoteClientId("");
    setQuoteAmount("");
    setQuoteDesc("");
    setShowNewQuote(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white/95">
        <Link href="/dashboard" className="p-2 rounded-2xl text-gray-600 hover:bg-gray-100 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          Back
        </Link>
        <h1 className="flex-1 font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          Documents
        </h1>
      </header>
      <div className="flex-1 p-4 space-y-4">
        <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80">
          <button
            type="button"
            onClick={() => setActiveTab("quotes")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${activeTab === "quotes" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}
          >
            <FileStack className="w-4 h-4" />
            Quotes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 ${activeTab === "invoices" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}
          >
            <Receipt className="w-4 h-4" />
            Invoices
          </button>
        </div>

        {activeTab === "quotes" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowNewQuote((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20"
            >
              <Plus className="w-4 h-4" />
              New Quote
            </button>
            {showNewQuote && (
              <div className="rounded-2xl bg-white shadow-soft p-4 border-0 space-y-3">
                <select
                  value={quoteClientId}
                  onChange={(e) => setQuoteClientId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
                >
                  <option value="">Select client</option>
                  {companies.length > 0 && (
                    <optgroup label="Companies">
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {privateClients.length > 0 && (
                    <optgroup label="Private Clients">
                      {privateClients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <input
                  type="text"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="Amount (e.g. 1,500)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
                />
                <input
                  type="text"
                  value={quoteDesc}
                  onChange={(e) => setQuoteDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNewQuote(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">Cancel</button>
                  <button type="button" onClick={handleNewQuote} disabled={!quoteClientId || !quoteAmount.trim()} className="flex-1 py-2.5 rounded-xl bg-accent text-white font-medium disabled:opacity-50">Create Quote</button>
                </div>
              </div>
            )}
            {quotes.length === 0 && !showNewQuote && (
              <p className="text-sm text-gray-500 py-6 text-center rounded-2xl bg-gray-50">No quotes yet. Add a client in Clients, then create a quote above.</p>
            )}
            {(() => {
              const activeQuotes = quotes.filter((q) => q.status === "active");
              const byCompany = activeQuotes.filter((q) => getClientType(clients, q.clientId) !== "private");
              const byPrivate = activeQuotes.filter((q) => getClientType(clients, q.clientId) === "private");
              return (
                <>
                  {byCompany.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Companies</h3>
                      {byCompany.map((q) => (
                        <div key={q.id} className="rounded-2xl bg-white shadow-soft p-4 border-0 space-y-2 border-l-4 border-teal-200">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900">Quote #{q.number}</p>
                              <p className="text-sm text-gray-500">{q.clientName} · {q.amount}</p>
                              {q.description && <p className="text-xs text-gray-600 mt-1">{q.description}</p>}
                            </div>
                            <button
                              type="button"
                              onClick={() => { const inv = convertQuoteToInvoice(q.id); if (inv) setActiveTab("invoices"); }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20 shrink-0"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                              Convert to Invoice
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">{new Date(q.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {byPrivate.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Private Clients</h3>
                      {byPrivate.map((q) => (
                        <div key={q.id} className="rounded-2xl bg-white shadow-soft p-4 border-0 space-y-2 border-l-4 border-amber-200">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900">Quote #{q.number}</p>
                              <p className="text-sm text-gray-500">{q.clientName} · {q.amount}</p>
                              {q.description && <p className="text-xs text-gray-600 mt-1">{q.description}</p>}
                            </div>
                            <button
                              type="button"
                              onClick={() => { const inv = convertQuoteToInvoice(q.id); if (inv) setActiveTab("invoices"); }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20 shrink-0"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                              Convert to Invoice
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">{new Date(q.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            {quotes.filter((q) => q.status === "canceled").length > 0 && (
              <p className="text-xs text-gray-400">Canceled quotes are not shown.</p>
            )}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-3">
            {invoices.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center rounded-2xl bg-gray-50">No invoices. Convert a quote to create one.</p>
            )}
            {(() => {
              const byCompany = invoices.filter((inv) => getClientType(clients, inv.clientId) !== "private");
              const byPrivate = invoices.filter((inv) => getClientType(clients, inv.clientId) === "private");
              return (
                <>
                  {byCompany.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Companies</h3>
                      {byCompany.map((inv) => (
                        <div key={inv.id} className="rounded-2xl bg-white shadow-soft p-4 border-0 space-y-2 border-l-4 border-teal-200">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900">Invoice #{inv.number}</p>
                              <p className="text-sm text-gray-500">{inv.clientName} · {inv.amount}</p>
                              {inv.description && <p className="text-xs text-gray-600 mt-1">{inv.description}</p>}
                              {inv.status === "canceled" && (
                                <span className="inline-block mt-2 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-medium">Canceled</span>
                              )}
                            </div>
                            {inv.status === "active" && (
                              <>
                                <button type="button" onClick={() => openInvoicePdf(inv, companyProfile.name || "Company", companyProfile.signature)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 shrink-0 flex items-center gap-1">
                                  <FileDown className="w-4 h-4" />
                                  PDF
                                </button>
                                <button type="button" onClick={() => cancelInvoice(inv.id)} className="px-3 py-2 rounded-xl bg-amber-100 text-amber-800 font-medium text-sm hover:bg-amber-200 shrink-0">
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {byPrivate.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Private Clients</h3>
                      {byPrivate.map((inv) => (
                        <div key={inv.id} className="rounded-2xl bg-white shadow-soft p-4 border-0 space-y-2 border-l-4 border-amber-200">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900">Invoice #{inv.number}</p>
                              <p className="text-sm text-gray-500">{inv.clientName} · {inv.amount}</p>
                              {inv.description && <p className="text-xs text-gray-600 mt-1">{inv.description}</p>}
                              {inv.status === "canceled" && (
                                <span className="inline-block mt-2 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-medium">Canceled</span>
                              )}
                            </div>
                            {inv.status === "active" && (
                              <>
                                <button type="button" onClick={() => openInvoicePdf(inv, companyProfile.name || "Company", companyProfile.signature)} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 shrink-0 flex items-center gap-1">
                                  <FileDown className="w-4 h-4" />
                                  PDF
                                </button>
                                <button type="button" onClick={() => cancelInvoice(inv.id)} className="px-3 py-2 rounded-xl bg-amber-100 text-amber-800 font-medium text-sm hover:bg-amber-200 shrink-0">
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        <div className="flex gap-2">
          <Link href="/dashboard/finances/company-profile" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Company
          </Link>
          <Link href="/dashboard/finances/clients" className="flex-1 text-center py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Clients
          </Link>
        </div>
      </div>
    </div>
  );
}
