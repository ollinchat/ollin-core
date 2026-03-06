"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/contexts/LocaleContext";
import { useFinance } from "@/contexts/FinanceContext";
import { useBilling } from "@/contexts/BillingContext";
import { useInternalMessages } from "@/contexts/ChatEngineContext";
import { useContacts } from "@/contexts/ContactsContext";
import type { FinanceClient, TaxInvoice } from "@/lib/finance-types";
import type { BillingDocument, BillingExpense } from "@/modules/billing/types";
import { ChevronLeft, FileText, Receipt, FileStack, Plus, Package, Pencil, UserPlus, DollarSign, TrendingUp, Download, Trash2, ChevronDown, X, Loader2 } from "lucide-react";
import { DocumentCard } from "@/components/finances/DocumentCard";
import { EditProfileModal } from "@/components/finances/EditProfileModal";
import { AddClientModal } from "@/components/finances/AddClientModal";
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

const TEAL = "#008080";

type TabId = "quotes" | "invoices" | "receipts" | "delivery_notes" | "expenses";
type UiStatus = "draft" | "pending" | "paid" | "canceled" | "overdue";

function docTypeLabel(t: BillingDocument["type"]): string {
  if (t === "invoice") return "Invoice";
  if (t === "quote") return "Quote";
  if (t === "receipt") return "Receipt";
  if (t === "delivery_note") return "Delivery Note";
  if (t === "credit_note") return "Credit Note";
  return "Draft";
}

function formatMoney(n: number): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

function StatusBadge({ status }: { status: UiStatus }) {
  const cls =
    status === "paid"
      ? "bg-green-100/70 text-green-700 font-semibold"
      : status === "overdue"
        ? "bg-red-100/60 text-red-700 font-semibold"
        : status === "pending"
          ? "bg-amber-100/60 text-amber-700 font-semibold"
          : status === "canceled"
            ? "bg-gray-100/80 text-gray-600 font-medium"
            : "bg-gray-100/70 text-gray-700 font-medium";
  const label = status === "overdue" ? "Overdue" : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs ${cls}`}>{label}</span>;
}

function docDateIso(doc: BillingDocument): string {
  if (doc.date && /^\d{4}-\d{2}-\d{2}$/.test(doc.date)) return doc.date;
  return new Date(doc.createdAt || Date.now()).toISOString().slice(0, 10);
}

function expenseDateIso(e: BillingExpense): string {
  if (e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) return e.date;
  return new Date(e.createdAt || Date.now()).toISOString().slice(0, 10);
}

function getInvoiceUiStatus(doc: BillingDocument, todayIso: string): UiStatus {
  const s = doc.status as UiStatus;
  if (doc.type !== "invoice") return s;
  if (s === "paid" || s === "canceled" || s === "draft") return s;
  if (s === "pending" && doc.dueDate && doc.dueDate < todayIso) return "overdue";
  return "pending";
}

function ExpenseModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: Omit<BillingExpense, "id" | "createdAt">) => void;
}) {
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add Expense</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-gray-900" />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium">Cancel</button>
          <button
            type="button"
            onClick={() => {
              const amt = parseFloat(amount) || 0;
              onSave({ vendor: vendor.trim() || "Vendor", amount: amt, category: category.trim() || "General", date: date || new Date().toISOString().slice(0, 10) });
              setVendor("");
              setAmount("");
              setCategory("General");
              setDate(new Date().toISOString().slice(0, 10));
              onClose();
            }}
            disabled={!vendor.trim()}
            className="flex-1 py-2.5 rounded-xl text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { locale } = useLocale();
  const {
    documents,
    clients: billingClients,
    expenses,
    downloadPdf,
    addExpense,
    removeExpense,
    convertQuoteToInvoice,
    createReceipt,
    markPaid,
    issueCreditNote,
    cancelQuote,
  } = useBilling();
  const { getConversationsWithMeta, currentUserId } = useInternalMessages();
  const { contacts } = useContacts();

  const [activeTab, setActiveTab] = useState<TabId>("quotes");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showSuccessToast = useCallback((message: string) => {
    setToastMessage(message);
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleConvertToInvoice = useCallback(
    (docId: string) => {
      setLoadingDocId(docId);
      setTimeout(() => {
        if (convertQuoteToInvoice(docId)) {
          setActiveTab("invoices");
          showSuccessToast(locale === "he" ? "הצעת מחיר הומרה לחשבונית" : "Quote converted to invoice");
        }
        setLoadingDocId(null);
      }, 400);
    },
    [convertQuoteToInvoice, showSuccessToast, locale]
  );

  const handleMarkPaid = useCallback(
    (docId: string) => {
      setLoadingDocId(docId);
      setTimeout(() => {
        if (markPaid(docId)) showSuccessToast(locale === "he" ? "החשבונית סומנה כשולמה" : "Invoice marked as paid");
        setLoadingDocId(null);
      }, 400);
    },
    [markPaid, showSuccessToast, locale]
  );

  const handleIssueReceipt = useCallback(
    (docId: string) => {
      setLoadingDocId(docId);
      setTimeout(() => {
        if (createReceipt(docId)) {
          setActiveTab("receipts");
          showSuccessToast(locale === "he" ? "קבלה נוצרה" : "Receipt issued");
        }
        setLoadingDocId(null);
      }, 400);
    },
    [createReceipt, showSuccessToast, locale]
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const chatList = useMemo(() => getConversationsWithMeta(currentUserId), [getConversationsWithMeta, currentUserId]);
  const clientOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    billingClients.forEach((c) => byId.set(c.id, { id: c.id, name: c.name }));
    chatList.forEach(({ contactId }) => {
      if (byId.has(contactId)) return;
      const contact = contacts.find((c) => c.id === contactId || c.phone === contactId);
      byId.set(contactId, { id: contactId, name: contact?.name ?? contactId });
    });
    // also include any clients present on documents
    documents.forEach((d) => {
      if (!byId.has(d.clientId)) byId.set(d.clientId, { id: d.clientId, name: d.clientName || d.clientId });
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [billingClients, chatList, contacts, documents]);

  const inRange = (iso: string) => {
    if (dateFrom && iso < dateFrom) return false;
    if (dateTo && iso > dateTo) return false;
    return true;
  };
  const byClient = (clientId: string) => (!filterClientId ? true : clientId === filterClientId);

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const iso = docDateIso(d);
      if (!inRange(iso)) return false;
      if (!byClient(d.clientId)) return false;
      if (activeTab === "quotes") return d.type === "quote";
      if (activeTab === "invoices") return d.type === "invoice";
      if (activeTab === "receipts") return d.type === "receipt";
      if (activeTab === "delivery_notes") return d.type === "delivery_note";
      return false;
    });
  }, [documents, activeTab, dateFrom, dateTo, filterClientId]);

  const filteredExpenses = useMemo(() => expenses.filter((e) => inRange(expenseDateIso(e))), [expenses, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    const receipts = documents.filter((d) => d.type === "receipt").filter((d) => inRange(docDateIso(d)) && byClient(d.clientId));
    const invoices = documents.filter((d) => d.type === "invoice").filter((d) => inRange(docDateIso(d)) && byClient(d.clientId));
    const quotes = documents.filter((d) => d.type === "quote").filter((d) => inRange(docDateIso(d)) && byClient(d.clientId));

    const totalPaid = receipts.filter((r) => (r.status as string) === "paid").reduce((s, r) => s + (r.total || 0), 0);
    const unpaidInvoices = invoices.filter((inv) => getInvoiceUiStatus(inv, todayIso) === "pending" || getInvoiceUiStatus(inv, todayIso) === "overdue");
    const unpaidAmount = unpaidInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
    const activeQuotes = quotes.filter((q) => (q.status as string) !== "canceled").length;
    const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    return { totalPaid, unpaidAmount, unpaidCount: unpaidInvoices.length, activeQuotes, totalExpenses };
  }, [documents, dateFrom, dateTo, filterClientId, filteredExpenses, todayIso]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "quotes", label: locale === "he" ? "הצעות" : "Quotes", icon: <FileStack className="w-4 h-4" /> },
    { id: "invoices", label: locale === "he" ? "חשבוניות" : "Invoices", icon: <FileText className="w-4 h-4" /> },
    { id: "receipts", label: locale === "he" ? "קבלות" : "Receipts", icon: <Receipt className="w-4 h-4" /> },
    { id: "delivery_notes", label: locale === "he" ? "תעודות משלוח" : "Delivery Notes", icon: <Package className="w-4 h-4" /> },
    { id: "expenses", label: locale === "he" ? "הוצאות" : "Expenses", icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans antialiased">
      {/* Success toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-[200] flex justify-center pt-4 px-4 pointer-events-none"
          >
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">✓</span>
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-white shadow-sm min-h-[56px]">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 py-2 pr-2 -ml-1 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <h1 className="flex-1 min-w-0 font-semibold text-gray-900 text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 shrink-0" style={{ color: TEAL }} />
          Documents
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEditProfile(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-white transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500/50"
            style={{ backgroundColor: TEAL }}
            title={locale === "he" ? "ערוך פרופיל" : "Edit Profile"}
            aria-label="Edit Profile"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowAddClient(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-gray-100 bg-white text-gray-600 transition-all hover:shadow-md hover:-translate-y-0.5 hover:bg-gray-50 hover:border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300/50"
            title={locale === "he" ? "הוסף לקוח" : "Add Client"}
            aria-label="Add Client"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Collapsible Financial Snapshot */}
      <section className="px-4 pt-3">
        <button
          type="button"
          onClick={() => setSnapshotOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 py-3 px-4 rounded-xl border border-gray-100 bg-white shadow-sm text-left text-sm font-medium text-gray-700 hover:bg-gray-50/80 transition-colors"
        >
          <span>{locale === "he" ? "תצוגת סיכום פיננסי" : snapshotOpen ? "View Financial Snapshot ▴" : "View Financial Snapshot ▾"}</span>
          <motion.span
            animate={{ rotate: snapshotOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="shrink-0 text-gray-500"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {snapshotOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-4 pb-3 px-1 rounded-b-xl bg-gray-50/80 border border-t-0 border-gray-100 shadow-sm">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Paid (Receipts)</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{formatMoney(metrics.totalPaid)}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unpaid Invoices</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{metrics.unpaidCount} · {formatMoney(metrics.unpaidAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Quotes</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{metrics.activeQuotes}</p>
                  </div>
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Expenses</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{formatMoney(metrics.totalExpenses)}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-3 mt-3 flex flex-col sm:flex-row gap-3 flex-wrap">
                  <div className="flex gap-2 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border border-gray-100 px-2.5 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border border-gray-100 px-2.5 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Filter by Client</label>
                    <select value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)} className="w-full rounded-lg border border-gray-100 px-2.5 py-1.5 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500/20">
                      <option value="">All clients</option>
                      {clientOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setFilterClientId(""); }} className="self-end sm:self-auto px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">
                    Clear
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex gap-1 p-1 rounded-2xl bg-gray-100/80 overflow-x-auto border border-gray-100 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-0 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${activeTab === t.id ? "bg-white shadow-sm text-gray-900 border border-gray-100" : "text-gray-600 hover:text-gray-800"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <main className="flex-1 px-4 py-4">
        {activeTab !== "expenses" ? (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600">Type / Number</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600">Client</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600">Date</th>
                  <th className="text-right px-5 py-4 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-5 py-4 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-5 py-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500 font-medium">
                      No documents in this view.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((d) => {
                    const uiStatus = getInvoiceUiStatus(d, todayIso);
                    const isQuote = d.type === "quote";
                    const isInvoice = d.type === "invoice";
                    const notCanceled = (d.status as string) !== "canceled";
                    const canConvertQuote = isQuote && notCanceled;
                    const canCancel = (isQuote || isInvoice) && notCanceled;
                    const isLoading = loadingDocId === d.id;
                    return (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-900">{docTypeLabel(d.type)} #{d.number}</td>
                        <td className="px-5 py-4 text-gray-700">{d.clientName || "—"}</td>
                        <td className="px-5 py-4 text-gray-700">{docDateIso(d)}</td>
                        <td className="px-5 py-4 text-right font-medium text-gray-900">{formatMoney(d.total || 0)}</td>
                        <td className="px-5 py-4"><StatusBadge status={uiStatus} /></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <div className="inline-flex items-center rounded-lg border border-gray-100 bg-gray-50/50 p-0.5 gap-0.5">
                              <button
                                type="button"
                                onClick={() => downloadPdf(d.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-gray-600 hover:bg-white hover:text-gray-900 text-xs font-medium transition-colors border border-transparent shadow-sm"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                                PDF
                              </button>
                              {canConvertQuote && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleConvertToInvoice(d.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-white text-xs font-medium hover:opacity-90 disabled:opacity-70 transition-opacity"
                                  style={{ backgroundColor: TEAL }}
                                  title="Convert to Invoice"
                                >
                                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                  {locale === "he" ? "לחשבונית" : "To Invoice"}
                                </button>
                              )}
                              {isInvoice && notCanceled && (d.status as string) !== "paid" && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleMarkPaid(d.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-70 transition-opacity"
                                  title="Mark Paid"
                                >
                                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (locale === "he" ? "שולם" : "Mark Paid")}
                                </button>
                              )}
                              {isInvoice && notCanceled && (d.status as string) === "paid" && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => handleIssueReceipt(d.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-white text-xs font-medium hover:opacity-90 disabled:opacity-70 transition-opacity"
                                  style={{ backgroundColor: TEAL }}
                                  title="Issue Receipt"
                                >
                                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Receipt className="w-3.5 h-3.5" />{locale === "he" ? "הנפק קבלה" : "Issue Receipt"}</>}
                                </button>
                              )}
                            </div>
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => { isQuote ? cancelQuote(d.id) : issueCreditNote(d.id); }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                title={locale === "he" ? "ביטול" : "Cancel"}
                                aria-label="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowAddExpense(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow transition-shadow" style={{ backgroundColor: TEAL }}>
                <Plus className="w-4 h-4" /> Add Expense
              </button>
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-4 font-semibold text-gray-600">Vendor</th>
                    <th className="text-left px-5 py-4 font-semibold text-gray-600">Category</th>
                    <th className="text-left px-5 py-4 font-semibold text-gray-600">Date</th>
                    <th className="text-right px-5 py-4 font-semibold text-gray-600">Amount</th>
                    <th className="text-right px-5 py-4 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-gray-500 font-medium">No expenses in this date range.</td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 font-medium text-gray-900">{e.vendor}</td>
                        <td className="px-5 py-4 text-gray-700">{e.category}</td>
                        <td className="px-5 py-4 text-gray-700">{expenseDateIso(e)}</td>
                        <td className="px-5 py-4 text-right font-medium text-gray-900">{formatMoney(e.amount)}</td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" onClick={() => removeExpense(e.id)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" aria-label="Remove expense">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <EditProfileModal open={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <AddClientModal open={showAddClient} onClose={() => setShowAddClient(false)} />
      <ExpenseModal open={showAddExpense} onClose={() => setShowAddExpense(false)} onSave={(e) => addExpense(e)} />
    </div>
  );
}

function LegacyFinanceDocumentsPage() {
  const { locale } = useLocale();
  const {
    companyProfile,
    clients,
    quotes,
    invoices,
    receipts,
    deliveryNotes,
    expenses,
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
  const { getConversationsWithMeta, currentUserId } = useInternalMessages();
  const { contacts } = useContacts();
  const [activeTab, setActiveTab] = useState<"quotes" | "invoices" | "receipts" | "delivery_notes" | "expenses">("quotes");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
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

  const chatList = useMemo(() => getConversationsWithMeta(currentUserId), [getConversationsWithMeta, currentUserId]);
  const filterClientOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    clients.forEach((c) => byId.set(c.id, { id: c.id, name: c.name }));
    chatList.forEach(({ contactId }) => {
      if (byId.has(contactId)) return;
      const contact = contacts.find((c) => c.id === contactId || c.phone === contactId);
      byId.set(contactId, { id: contactId, name: contact?.name ?? contactId });
    });
    return Array.from(byId.values());
  }, [clients, chatList, contacts]);

  const inDateRange = (dateStr: string, createdAt?: number) => {
    const d = dateStr || (createdAt ? new Date(createdAt).toISOString().slice(0, 10) : "");
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  };
  const byClient = (clientId: string) => {
    if (!filterClientId) return true;
    return clientId === filterClientId;
  };

  const filteredReceipts = useMemo(() => receipts.filter((r) => (r.status as string) !== "canceled" && byClient(r.clientId) && inDateRange(r.date, r.createdAt)), [receipts, filterClientId, dateFrom, dateTo]);
  const filteredInvoices = useMemo(() => invoices.filter((inv) => byClient(inv.clientId) && inDateRange(inv.date, inv.createdAt)), [invoices, filterClientId, dateFrom, dateTo]);
  const filteredQuotes = useMemo(() => quotes.filter((q) => (q.status as string) !== "canceled" && byClient(q.clientId) && inDateRange(q.date, q.createdAt)), [quotes, filterClientId, dateFrom, dateTo]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => inDateRange(e.date, e.createdAt)), [expenses, dateFrom, dateTo]);

  const totalPaid = useMemo(() => filteredReceipts.reduce((s, r) => s + r.total, 0), [filteredReceipts]);
  const unpaidInvoices = useMemo(() => filteredInvoices.filter((inv) => inv.status !== "paid" && inv.status !== "canceled"), [filteredInvoices]);
  const unpaidAmount = useMemo(() => unpaidInvoices.reduce((s, inv) => s + inv.total, 0), [unpaidInvoices]);
  const activeQuotesCount = useMemo(() => filteredQuotes.filter((q) => (q.status as string) !== "canceled").length, [filteredQuotes]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

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
