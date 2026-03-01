"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import { useFinance } from "@/contexts/FinanceContext";
import type { FinanceClient, TaxInvoice } from "@/lib/finance-types";
import { ChevronLeft, FileText, Receipt, FileStack, Plus, Package } from "lucide-react";
import { DocumentCard } from "@/components/finances/DocumentCard";
import type { Quote, DeliveryNote, LineItem } from "@/lib/finance-types";
import { TAX_INVOICE_HEADER_EN, TAX_INVOICE_HEADER_HE, QUOTE_HEADER_EN, QUOTE_HEADER_HE, DELIVERY_NOTE_HEADER_EN, DELIVERY_NOTE_HEADER_HE, DEFAULT_VAT_RATE } from "@/lib/finance-types";
import { LiveDocumentEditor } from "@/components/finances/LiveDocumentEditor";

function openInvoicePdf(inv: TaxInvoice, companyName: string, signatureDataUrl?: string, locale: "en" | "he" = "en") {
  const title = locale === "he" ? TAX_INVOICE_HEADER_HE : TAX_INVOICE_HEADER_EN;
  const clientLabel = locale === "he" ? "לקוח" : "Client";
  const descLabel = locale === "he" ? "תיאור" : "Description";
  const qtyLabel = locale === "he" ? "כמות" : "Qty";
  const priceLabel = locale === "he" ? "מחיר" : "Price";
  const totalLabel = locale === "he" ? "סה\"כ" : "Total";
  const subtotalLabel = locale === "he" ? "סיכום ביניים" : "Subtotal";
  const dueLabel = locale === "he" ? "תאריך פירעון" : "Due";
  const dateLabel = locale === "he" ? "תאריך" : "Date";
  const sigLabel = locale === "he" ? "חתימה" : "Authorized signature";
  const rows = inv.items.map((i) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${i.unitPrice.toFixed(2)}</td><td>${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`).join("");
  const signatureHtml = signatureDataUrl
    ? `<div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #e5e7eb;"><p style="font-size:0.75rem;color:#6b7280;">${sigLabel}</p><img src="${signatureDataUrl}" alt="Signature" style="max-width:180px;height:auto;" /></div>`
    : "";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} #${inv.number}</title><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto;} h1{color:#008080;} table{width:100%;border-collapse:collapse;} th,td{border-bottom:1px solid #eee;padding:8px 0;} th{text-align:left;color:#6b7280;font-weight:500;}</style></head><body><h1>${title}</h1><p style="color:#6b7280;">#${inv.number}</p><p><strong>${companyName}</strong></p><p>${clientLabel}: ${inv.clientName}</p><p>${dateLabel}: ${inv.date}${inv.dueDate ? ` · ${dueLabel}: ${inv.dueDate}` : ""}</p><table><thead><tr><th>${descLabel}</th><th>${qtyLabel}</th><th>${priceLabel}</th><th>${totalLabel}</th></tr></thead><tbody>${rows}</tbody></table><p>${subtotalLabel}: ${inv.subtotal.toFixed(2)} · VAT ${inv.vatRate}%: ${inv.vatAmount.toFixed(2)} · <strong>${totalLabel}: ${inv.total.toFixed(2)}</strong></p>${signatureHtml}</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

function openQuotePdf(q: Quote, companyName: string, locale: "en" | "he" = "en") {
  const title = locale === "he" ? QUOTE_HEADER_HE : QUOTE_HEADER_EN;
  const clientLabel = locale === "he" ? "לקוח" : "Client";
  const descLabel = locale === "he" ? "תיאור" : "Description";
  const qtyLabel = locale === "he" ? "כמות" : "Qty";
  const priceLabel = locale === "he" ? "מחיר" : "Price";
  const totalLabel = locale === "he" ? "סה\"כ" : "Total";
  const subtotalLabel = locale === "he" ? "סיכום ביניים" : "Subtotal";
  const dateLabel = locale === "he" ? "תאריך" : "Date";
  const rows = q.items.map((i) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${i.unitPrice.toFixed(2)}</td><td>${(i.quantity * i.unitPrice).toFixed(2)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} #${q.number}</title><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:600px;margin:0 auto;} h1{color:#008080;} table{width:100%;border-collapse:collapse;} th,td{border-bottom:1px solid #eee;padding:8px 0;}</style></head><body><h1>${title}</h1><p style="color:#6b7280;">#${q.number}</p><p><strong>${companyName}</strong></p><p>${clientLabel}: ${q.clientName}</p><p>${dateLabel}: ${q.date}</p><table><thead><tr><th>${descLabel}</th><th>${qtyLabel}</th><th>${priceLabel}</th><th>${totalLabel}</th></tr></thead><tbody>${rows}</tbody></table><p>${subtotalLabel}: ${q.subtotal.toFixed(2)} · VAT ${q.vatRate}%: ${q.vatAmount.toFixed(2)} · <strong>${totalLabel}: ${q.total.toFixed(2)}</strong></p></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
}

function getClientType(clients: FinanceClient[], clientId: string): "company" | "private" | "other" {
  const c = clients.find((x) => x.id === clientId);
  if (c?.clientType === "private") return "private";
  if (c?.clientType === "company") return "company";
  return "other";
}

function companyDisplayName(profile: { name?: string; nameEn?: string; nameHe?: string }, locale: "en" | "he"): string {
  if (locale === "he" && profile.nameHe) return profile.nameHe;
  if (profile.nameEn) return profile.nameEn;
  return profile.name || "Company";
}

export default function DocumentsPage() {
  const { locale } = useLocale();
  const {
    companyProfile,
    clients,
    quotes,
    invoices,
    receipts,
    deliveryNotes,
    addQuote,
    addDeliveryNote,
    convertQuoteToInvoice,
    cancelInvoice,
    getInvoiceEffectiveStatus,
    issueReceiptFromInvoice,
    updateInvoiceStatus,
    updateInvoice,
    updateQuoteStatus,
  } = useFinance();
  const [activeTab, setActiveTab] = useState<"quotes" | "invoices" | "receipts" | "delivery_notes">("quotes");
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [showNewDeliveryNote, setShowNewDeliveryNote] = useState(false);
  const [quoteClientId, setQuoteClientId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const [deliveryNoteClientId, setDeliveryNoteClientId] = useState("");
  const [deliveryNoteAmount, setDeliveryNoteAmount] = useState("");
  const [deliveryNoteDesc, setDeliveryNoteDesc] = useState("");
  const [deliveryNoteNotes, setDeliveryNoteNotes] = useState("");
  const [quoteUseDocumentEditor, setQuoteUseDocumentEditor] = useState(false);
  const [quoteEditorItems, setQuoteEditorItems] = useState<LineItem[]>([{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  const [quoteEditorVatRate, setQuoteEditorVatRate] = useState(DEFAULT_VAT_RATE);
  const [quoteEditorDate, setQuoteEditorDate] = useState(new Date().toISOString().slice(0, 10));
  const [quoteEditorDueDate, setQuoteEditorDueDate] = useState("");
  const companies = useMemo(() => clients.filter((c) => c.clientType === "company" || !c.clientType), [clients]);
  const privateClients = useMemo(() => clients.filter((c) => c.clientType === "private"), [clients]);
  const selectedClient = useMemo(() => clients.find((c) => c.id === quoteClientId), [clients, quoteClientId]);

  const handleNewQuote = () => {
    const client = clients.find((c) => c.id === quoteClientId);
    if (!client || !quoteAmount.trim()) return;
    addQuote({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientAddress: client.address,
      clientVatId: client.vatId,
      clientHpNumber: client.hpNumber,
      amount: quoteAmount.trim(),
      description: quoteDesc.trim(),
      date: new Date().toISOString().slice(0, 10),
    });
    setQuoteClientId("");
    setQuoteAmount("");
    setQuoteDesc("");
    setShowNewQuote(false);
    setQuoteUseDocumentEditor(false);
  };

  const handleNewQuoteFromEditor = () => {
    if (!selectedClient) return;
    addQuote({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      clientAddress: selectedClient.address,
      clientVatId: selectedClient.vatId,
      clientHpNumber: selectedClient.hpNumber,
      items: quoteEditorItems,
      date: quoteEditorDate,
      dueDate: quoteEditorDueDate || undefined,
      vatRate: quoteEditorVatRate,
    });
    setQuoteClientId("");
    setQuoteEditorItems([{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
    setQuoteEditorDate(new Date().toISOString().slice(0, 10));
    setQuoteEditorDueDate("");
    setQuoteEditorVatRate(companyProfile?.vatRate ?? DEFAULT_VAT_RATE);
    setShowNewQuote(false);
    setQuoteUseDocumentEditor(false);
  };

  const handleNewDeliveryNote = () => {
    const client = clients.find((c) => c.id === deliveryNoteClientId);
    if (!client || !deliveryNoteAmount.trim()) return;
    const amountNum = parseFloat(deliveryNoteAmount.replace(/,/g, "")) || 0;
    addDeliveryNote({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientAddress: client.address,
      clientVatId: client.vatId,
      clientHpNumber: client.hpNumber,
      items: [{ id: crypto.randomUUID(), description: deliveryNoteDesc.trim() || "Item", quantity: 1, unitPrice: amountNum }],
      date: new Date().toISOString().slice(0, 10),
      notes: deliveryNoteNotes.trim() || undefined,
    });
    setDeliveryNoteClientId("");
    setDeliveryNoteAmount("");
    setDeliveryNoteDesc("");
    setDeliveryNoteNotes("");
    setShowNewDeliveryNote(false);
  };

  const formatTotal = (n: number) => (typeof n === "number" ? n.toFixed(2) : String(n));
  const isActive = (s: string) => s !== "canceled";

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
        <div className="flex gap-1 p-1 rounded bg-gray-100/80 overflow-x-auto">
          <button type="button" onClick={() => setActiveTab("quotes")} className={`flex-1 min-w-0 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "quotes" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}>
            <FileStack className="w-4 h-4 shrink-0" />
            {locale === "he" ? "הצעות" : "Quotes"}
          </button>
          <button type="button" onClick={() => setActiveTab("invoices")} className={`flex-1 min-w-0 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "invoices" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}>
            <FileText className="w-4 h-4 shrink-0" />
            {locale === "he" ? "חשבוניות" : "Invoices"}
          </button>
          <button type="button" onClick={() => setActiveTab("receipts")} className={`flex-1 min-w-0 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "receipts" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}>
            <Receipt className="w-4 h-4 shrink-0" />
            {locale === "he" ? "קבלות" : "Receipts"}
          </button>
          <button type="button" onClick={() => setActiveTab("delivery_notes")} className={`flex-1 min-w-0 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === "delivery_notes" ? "bg-white shadow-soft text-gray-900" : "text-gray-600"}`}>
            <Package className="w-4 h-4 shrink-0" />
            {locale === "he" ? "תעודות משלוח" : "Delivery Notes"}
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
              <div className="space-y-3">
                {quoteUseDocumentEditor && selectedClient ? (
                  <>
                    <p className="text-xs text-gray-500">{locale === "he" ? "תצוגת מסמך A4 — עריכה בזמן אמת" : "Live A4 document — edit below"}</p>
                    <LiveDocumentEditor
                      kind="quote"
                      locale={locale}
                      number="—"
                      companyName={companyProfile?.nameEn || companyProfile?.name || "Company"}
                      companyNameHe={companyProfile?.nameHe}
                      companyAddress={companyProfile?.address}
                      logoUrl={companyProfile?.logo}
                      clientName={selectedClient.name}
                      clientAddress={selectedClient.address}
                      date={quoteEditorDate}
                      dueDate={quoteEditorDueDate || undefined}
                      items={quoteEditorItems}
                      vatRate={quoteEditorVatRate}
                      onItemsChange={setQuoteEditorItems}
                      onVatRateChange={setQuoteEditorVatRate}
                      onDateChange={setQuoteEditorDate}
                      onDueDateChange={setQuoteEditorDueDate}
                      editable
                      showQrPlaceholder
                      signatureDataUrl={companyProfile?.signature}
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setQuoteUseDocumentEditor(false)} className="flex-1 py-2.5 rounded bg-gray-100 text-gray-700 font-medium">{locale === "he" ? "חזרה" : "Back"}</button>
                      <button type="button" onClick={handleNewQuoteFromEditor} className="flex-1 py-2.5 rounded bg-accent text-white font-medium">Create Quote</button>
                    </div>
                  </>
                ) : (
                  <div className="rounded bg-white shadow-soft p-4 border border-gray-200 space-y-3">
                    <select value={quoteClientId} onChange={(e) => setQuoteClientId(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900">
                      <option value="">{locale === "he" ? "בחר לקוח" : "Select client"}</option>
                      {companies.length > 0 && <optgroup label={locale === "he" ? "חברות" : "Companies"}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                      {privateClients.length > 0 && <optgroup label={locale === "he" ? "פרטי" : "Private"}>{privateClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                    </select>
                    {selectedClient && (
                      <div className="rounded bg-gray-50 p-2.5 text-xs text-gray-600 space-y-0.5">
                        {selectedClient.email && <p>Email: {selectedClient.email}</p>}
                        {selectedClient.address && <p>Address: {selectedClient.address}</p>}
                        {(selectedClient.vatId || selectedClient.hpNumber) && <p>VAT / H.P.: {[selectedClient.vatId, selectedClient.hpNumber].filter(Boolean).join(" · ")}</p>}
                      </div>
                    )}
                    <input type="text" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} placeholder={locale === "he" ? "סכום" : "Amount (e.g. 1,500)"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                    <input type="text" value={quoteDesc} onChange={(e) => setQuoteDesc(e.target.value)} placeholder={locale === "he" ? "תיאור" : "Description (optional)"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowNewQuote(false)} className="flex-1 py-2.5 rounded bg-gray-100 text-gray-700 font-medium">Cancel</button>
                      <button type="button" onClick={handleNewQuote} disabled={!quoteClientId || !quoteAmount.trim()} className="flex-1 py-2.5 rounded bg-accent text-white font-medium disabled:opacity-50">Create Quote</button>
                    </div>
                    {selectedClient && (
                      <button type="button" onClick={() => { setQuoteUseDocumentEditor(true); setQuoteEditorVatRate(companyProfile?.vatRate ?? DEFAULT_VAT_RATE); setQuoteEditorDate(new Date().toISOString().slice(0, 10)); }} className="w-full py-2 rounded border border-[#008080]/40 text-[#006666] text-sm font-medium">
                        {locale === "he" ? "ערוך כמסמך A4" : "Edit as A4 document"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {quotes.length === 0 && !showNewQuote && (
              <p className="text-sm text-gray-500 py-6 text-center rounded-2xl bg-gray-50">No quotes yet. Add a client in Clients, then create a quote above.</p>
            )}
            {(() => {
              const activeQuotes = quotes.filter((q) => isActive(q.status as string));
              const byCompany = activeQuotes.filter((q) => getClientType(clients, q.clientId) !== "private");
              const byPrivate = activeQuotes.filter((q) => getClientType(clients, q.clientId) === "private");
              return (
                <>
                  {byCompany.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Companies</h3>
                      {byCompany.map((q) => (
                        <DocumentCard
                          key={q.id}
                          type="Quote"
                          number={q.number}
                          clientName={q.clientName}
                          total={q.total}
                          status={q.status as string}
                          date={new Date(q.createdAt).toLocaleDateString()}
                          dueDate={q.dueDate}
                          borderAccent="teal"
                          primaryAction={{ label: "Convert to Tax Invoice", onClick: () => { convertQuoteToInvoice(q.id) && setActiveTab("invoices"); } }}
                          onView={() => openQuotePdf(q, companyDisplayName(companyProfile, locale), locale)}
                          onPrint={() => openQuotePdf(q, companyDisplayName(companyProfile, locale), locale)}
                          onSendToClient={() => { const c = clients.find((x) => x.id === q.clientId); if (c?.email) window.location.href = `mailto:${c.email}?subject=Quote%20%23${q.number}`; }}
                          onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?quote=${q.id}`); }}
                          onChangeStatus={() => updateQuoteStatus(q.id, "sent")}
                          onCancel={() => updateQuoteStatus(q.id, "canceled")}
                        />
                      ))}
                    </div>
                  )}
                  {byPrivate.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Private Clients</h3>
                      {byPrivate.map((q) => (
                        <DocumentCard
                          key={q.id}
                          type="Quote"
                          number={q.number}
                          clientName={q.clientName}
                          total={q.total}
                          status={q.status as string}
                          date={new Date(q.createdAt).toLocaleDateString()}
                          dueDate={q.dueDate}
                          borderAccent="amber"
                          primaryAction={{ label: "Convert to Tax Invoice", onClick: () => { convertQuoteToInvoice(q.id) && setActiveTab("invoices"); } }}
                          onView={() => openQuotePdf(q, companyDisplayName(companyProfile, locale), locale)}
                          onPrint={() => openQuotePdf(q, companyDisplayName(companyProfile, locale), locale)}
                          onSendToClient={() => { const c = clients.find((x) => x.id === q.clientId); if (c?.email) window.location.href = `mailto:${c.email}?subject=Quote%20%23${q.number}`; }}
                          onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?quote=${q.id}`); }}
                          onChangeStatus={() => updateQuoteStatus(q.id, "sent")}
                          onCancel={() => updateQuoteStatus(q.id, "canceled")}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            {quotes.filter((q) => (q.status as string) === "canceled").length > 0 && (
              <p className="text-xs text-gray-400">Canceled quotes are not shown.</p>
            )}
          </div>
        )}

        {activeTab === "receipts" && (
          <div className="space-y-3">
            {receipts.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center rounded-2xl bg-gray-50">No receipts. Issue a receipt from an invoice.</p>
            )}
            {receipts.filter((r) => (r.status as string) !== "canceled").map((rec) => (
              <DocumentCard
                key={rec.id}
                type="Receipt"
                number={rec.number}
                clientName={rec.clientName}
                total={rec.total}
                status={rec.status as string}
                date={new Date(rec.createdAt).toLocaleDateString()}
                borderAccent="teal"
                onView={() => {}}
                onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?receipt=${rec.id}`); }}
              />
            ))}
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
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Companies</h3>
                      {byCompany.map((inv) => {
                        const eff = getInvoiceEffectiveStatus(inv);
                        return (
                          <DocumentCard
                            key={inv.id}
                            type="Invoice"
                            number={inv.number}
                            clientName={inv.clientName}
                            total={inv.total}
                            status={inv.status as string}
                            effectiveStatus={eff}
                            date={new Date(inv.createdAt).toLocaleDateString()}
                            dueDate={inv.dueDate}
                            borderAccent="teal"
                            primaryAction={inv.status !== "canceled" ? { label: "Issue Receipt", onClick: () => { issueReceiptFromInvoice(inv.id) && setActiveTab("receipts"); } } : undefined}
                            onView={() => openInvoicePdf(inv, companyDisplayName(companyProfile, locale), companyProfile.signature, locale)}
                            onPrint={() => openInvoicePdf(inv, companyDisplayName(companyProfile, locale), companyProfile.signature, locale)}
                            onSendToClient={() => { const c = clients.find((x) => x.id === inv.clientId); if (c?.email) window.location.href = `mailto:${c.email}?subject=Invoice%20%23${inv.number}`; }}
                            onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?invoice=${inv.id}`); }}
                            onChangeStatus={() => {}}
                            onCancel={inv.status !== "canceled" ? () => cancelInvoice(inv.id) : undefined}
                          >
                            {inv.status !== "canceled" && (
                              <>
                                {(inv.status === "draft" || (inv.status as string) === "active") && (
                                  <>
                                    <button type="button" onClick={() => updateInvoiceStatus(inv.id, "sent")} className="px-3 py-1.5 rounded-lg bg-[#008080]/15 text-[#006666] text-xs font-medium">Mark Sent</button>
                                    <input type="date" value={inv.dueDate || ""} onChange={(e) => updateInvoice(inv.id, { dueDate: e.target.value || undefined })} className="rounded-lg border border-gray-200 px-2 py-1 text-xs" title="Due date" />
                                  </>
                                )}
                                {((inv.status as string) === "sent" || (inv.status as string) === "active" || eff === "overdue") && (
                                  <button type="button" onClick={() => updateInvoiceStatus(inv.id, "paid")} className="px-3 py-1.5 rounded-lg bg-[#008080]/15 text-[#006666] text-xs font-medium">Mark Paid</button>
                                )}
                              </>
                            )}
                          </DocumentCard>
                        );
                      })}
                    </div>
                  )}
                  {byPrivate.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Private Clients</h3>
                      {byPrivate.map((inv) => {
                        const eff = getInvoiceEffectiveStatus(inv);
                        return (
                          <DocumentCard
                            key={inv.id}
                            type="Invoice"
                            number={inv.number}
                            clientName={inv.clientName}
                            total={inv.total}
                            status={inv.status as string}
                            effectiveStatus={eff}
                            date={new Date(inv.createdAt).toLocaleDateString()}
                            dueDate={inv.dueDate}
                            borderAccent="amber"
                            primaryAction={inv.status !== "canceled" ? { label: "Issue Receipt", onClick: () => { issueReceiptFromInvoice(inv.id) && setActiveTab("receipts"); } } : undefined}
                            onView={() => openInvoicePdf(inv, companyDisplayName(companyProfile, locale), companyProfile.signature, locale)}
                            onPrint={() => openInvoicePdf(inv, companyDisplayName(companyProfile, locale), companyProfile.signature, locale)}
                            onSendToClient={() => { const c = clients.find((x) => x.id === inv.clientId); if (c?.email) window.location.href = `mailto:${c.email}?subject=Invoice%20%23${inv.number}`; }}
                            onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?invoice=${inv.id}`); }}
                            onChangeStatus={() => {}}
                            onCancel={inv.status !== "canceled" ? () => cancelInvoice(inv.id) : undefined}
                          >
                            {inv.status !== "canceled" && (
                              <>
                                {(inv.status === "draft" || (inv.status as string) === "active") && (
                                  <>
                                    <button type="button" onClick={() => updateInvoiceStatus(inv.id, "sent")} className="px-3 py-1.5 rounded-lg bg-[#008080]/15 text-[#006666] text-xs font-medium">Mark Sent</button>
                                    <input type="date" value={inv.dueDate || ""} onChange={(e) => updateInvoice(inv.id, { dueDate: e.target.value || undefined })} className="rounded-lg border border-gray-200 px-2 py-1 text-xs" title="Due date" />
                                  </>
                                )}
                                {((inv.status as string) === "sent" || (inv.status as string) === "active" || eff === "overdue") && (
                                  <button type="button" onClick={() => updateInvoiceStatus(inv.id, "paid")} className="px-3 py-1.5 rounded-lg bg-[#008080]/15 text-[#006666] text-xs font-medium">Mark Paid</button>
                                )}
                              </>
                            )}
                          </DocumentCard>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === "delivery_notes" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowNewDeliveryNote((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20"
            >
              <Plus className="w-4 h-4" />
              {locale === "he" ? "תעודת משלוח חדשה" : "New Delivery Note"}
            </button>
            {showNewDeliveryNote && (
              <div className="rounded bg-white shadow-soft p-4 border border-gray-200 space-y-3">
                <select value={deliveryNoteClientId} onChange={(e) => setDeliveryNoteClientId(e.target.value)} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900">
                  <option value="">{locale === "he" ? "בחר לקוח" : "Select client"}</option>
                  {companies.length > 0 && <optgroup label={locale === "he" ? "חברות" : "Companies"}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                  {privateClients.length > 0 && <optgroup label={locale === "he" ? "פרטי" : "Private"}>{privateClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                </select>
                <input type="text" value={deliveryNoteAmount} onChange={(e) => setDeliveryNoteAmount(e.target.value)} placeholder={locale === "he" ? "סכום" : "Amount"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                <input type="text" value={deliveryNoteDesc} onChange={(e) => setDeliveryNoteDesc(e.target.value)} placeholder={locale === "he" ? "תיאור" : "Description"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                <input type="text" value={deliveryNoteNotes} onChange={(e) => setDeliveryNoteNotes(e.target.value)} placeholder={locale === "he" ? "הערות (אחריות/משך)" : "Notes (Warranty/Duration)"} className="w-full rounded border border-gray-200 px-3 py-2.5 text-gray-900" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNewDeliveryNote(false)} className="flex-1 py-2.5 rounded bg-gray-100 text-gray-700 font-medium">{locale === "he" ? "ביטול" : "Cancel"}</button>
                  <button type="button" onClick={handleNewDeliveryNote} disabled={!deliveryNoteClientId || !deliveryNoteAmount.trim()} className="flex-1 py-2.5 rounded bg-accent text-white font-medium disabled:opacity-50">{locale === "he" ? "צור תעודה" : "Create"}</button>
                </div>
              </div>
            )}
            {deliveryNotes.filter((d) => (d.status as string) !== "canceled").length === 0 && !showNewDeliveryNote && (
              <p className="text-sm text-gray-500 py-6 text-center rounded bg-gray-50">{locale === "he" ? "אין תעודות משלוח. צור אחת למעלה." : "No delivery notes. Create one above."}</p>
            )}
            {deliveryNotes.filter((d) => (d.status as string) !== "canceled").map((dn) => (
              <DocumentCard key={dn.id} type={locale === "he" ? "תעודת משלוח" : "Delivery Note"} number={dn.number} clientName={dn.clientName} total={dn.total} status={dn.status as string} date={new Date(dn.createdAt).toLocaleDateString()} borderAccent="teal" onView={() => {}} onShare={() => { navigator.clipboard.writeText(`${window.location.origin}/dashboard/finances/documents?delivery=${dn.id}`); }} />
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Link href="/dashboard/finances/company-profile" className="flex-1 text-center py-2.5 rounded bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Company
          </Link>
          <Link href="/dashboard/finances/clients" className="flex-1 text-center py-2.5 rounded bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200">
            Clients
          </Link>
        </div>
      </div>
    </div>
  );
}
