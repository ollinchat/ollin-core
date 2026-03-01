"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { useLocale } from "@/contexts/LocaleContext";
import { ChevronLeft, ChevronRight, FileText, Users, Building2, Hash, Receipt } from "lucide-react";

function getMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function getMonthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
}

export default function FinancesMoneyPage() {
  const { locale } = useLocale();
  const { quotes, invoices, receipts, clients } = useFinance();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [clientFilter, setClientFilter] = useState<string>("");

  const now = new Date();
  const rangeStart = new Date(dateFrom).getTime();
  const rangeEnd = new Date(dateTo).setHours(23, 59, 59, 999);

  const receiptsInRange = useMemo(() => {
    return receipts.filter(
      (r) =>
        (r.status as string) !== "canceled" &&
        r.createdAt >= rangeStart &&
        r.createdAt <= rangeEnd &&
        (clientFilter === "" || r.clientId === clientFilter)
    );
  }, [receipts, rangeStart, rangeEnd, clientFilter]);

  const totalRevenueMonthly = useMemo(() => {
    return receiptsInRange.reduce((s, r) => s + r.total, 0);
  }, [receiptsInRange]);

  const pendingPayments = useMemo(() => {
    return invoices
      .filter((inv) => (inv.status as string) !== "canceled" && (inv.status as string) !== "paid")
      .reduce((s, inv) => s + inv.total, 0);
  }, [invoices]);

  const quotesToClose = useMemo(() => {
    return quotes.filter((q) => (q.status as string) !== "canceled").length;
  }, [quotes]);

  const overdueCount = useMemo(() => {
    const today = now.toISOString().slice(0, 10);
    return invoices.filter(
      (inv) => (inv.status as string) === "sent" && inv.dueDate && inv.dueDate < today
    ).length;
  }, [invoices, now]);

  const clientMetrics = useMemo(() => {
    const byClient = new Map<string, { name: string; orderCount: number; totalPaid: number }>();
    receiptsInRange.forEach((r) => {
      const cur = byClient.get(r.clientId) ?? { name: r.clientName, orderCount: 0, totalPaid: 0 };
      cur.orderCount += 1;
      cur.totalPaid += r.total;
      byClient.set(r.clientId, cur);
    });
    return Array.from(byClient.entries()).map(([id, m]) => ({ clientId: id, ...m }));
  }, [receiptsInRange]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="flex-shrink-0 flex items-center gap-2 px-4 py-4 border-b border-gray-200 bg-white">
        <Link
          href="/dashboard"
          className="p-2 rounded-sm text-gray-600 hover:bg-gray-100 flex items-center gap-1"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{locale === "he" ? "חזרה" : "Back"}</span>
        </Link>
        <h1 className="flex-1 text-xl font-semibold text-gray-900 tracking-tight">
          {locale === "he" ? "תצוגת כספים" : "Money View"}
        </h1>
      </header>
      <div className="flex-1 p-4 space-y-6">
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-gray-200 bg-white p-3">
          <span className="text-xs font-semibold text-gray-500 uppercase">{locale === "he" ? "טווח תאריכים" : "Date range"}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-sm border border-gray-200 px-2 py-1.5 text-sm"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-sm border border-gray-200 px-2 py-1.5 text-sm"
          />
          <span className="text-xs font-semibold text-gray-500 uppercase ml-2">{locale === "he" ? "לקוח" : "Client"}</span>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-sm border border-gray-200 px-2 py-1.5 text-sm min-w-[140px]"
          >
            <option value="">{locale === "he" ? "הכל" : "All"}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {clientMetrics.length > 0 && (
          <div className="rounded-sm border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 font-semibold text-gray-700">{locale === "he" ? "שם לקוח" : "Client Name"}</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">{locale === "he" ? "מספר הזמנות" : "Order Count"}</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">{locale === "he" ? "סה״כ שולם (₪)" : "Total Paid (₪)"}</th>
                </tr>
              </thead>
              <tbody>
                {clientMetrics.map((row) => (
                  <tr key={row.clientId} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-900">{row.name}</td>
                    <td className="px-3 py-2 tabular-nums">{row.orderCount}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{row.totalPaid.toFixed(2)} ₪</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4">
          <div className="rounded-sm bg-white border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Revenue (Monthly)</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{totalRevenueMonthly.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          </div>
          <div className="rounded-sm bg-white border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pending Payments</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{pendingPayments.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">Unpaid invoices</p>
          </div>
          <div className="rounded-sm bg-white border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Quotes to Close</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{quotesToClose}</p>
            <p className="text-xs text-gray-400 mt-1">Active quotes</p>
          </div>
          {overdueCount > 0 && (
            <div className="rounded-sm bg-white border border-red-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Overdue Invoices</p>
              <p className="text-2xl font-bold text-red-700 tabular-nums">{overdueCount}</p>
              <p className="text-xs text-gray-500 mt-1">Require attention</p>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/dashboard/finances/settings"
            className="flex items-center justify-between p-4 rounded-sm bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Document Numbering</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/dashboard/finances/documents"
            className="flex items-center justify-between p-4 rounded-sm bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Documents</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/dashboard/finances/expenses"
            className="flex items-center justify-between p-4 rounded-sm bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">{locale === "he" ? "הוצאות" : "Expenses"}</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/dashboard/finances/clients"
            className="flex items-center justify-between p-4 rounded-sm bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Clients</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/dashboard/finances/company-profile"
            className="flex items-center justify-between p-4 rounded-sm bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Company Profile</span>
            </span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
