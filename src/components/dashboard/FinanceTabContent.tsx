"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { useLocale } from "@/contexts/LocaleContext";
import { ChevronRight, FileText, Users, Building2, Hash, Receipt } from "lucide-react";

function getMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function getMonthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
}

export function FinanceTabContent() {
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

  const isHe = locale === "he";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-white">
      <div className="flex flex-wrap items-center gap-3 border border-[var(--clean-border)] bg-white p-3">
        <span className="text-xs font-medium text-[var(--clean-text-secondary)] uppercase tracking-wider">{isHe ? "טווח תאריכים" : "Date range"}</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border border-[var(--clean-border)] px-2 py-1.5 text-[13px] text-[var(--clean-text)]"
        />
        <span className="text-[var(--clean-text-secondary)]">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border border-[var(--clean-border)] px-2 py-1.5 text-[13px] text-[var(--clean-text)]"
        />
        <span className="text-xs font-medium text-[var(--clean-text-secondary)] uppercase ml-2">{isHe ? "לקוח" : "Client"}</span>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="border border-[var(--clean-border)] px-2 py-1.5 text-[13px] text-[var(--clean-text)] min-w-[140px] bg-white"
        >
          <option value="">{isHe ? "הכל" : "All"}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {clientMetrics.length > 0 && (
        <div className="border border-[var(--clean-border)] bg-white overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--clean-border)] bg-[var(--clean-border)]/30">
                <th className="px-3 py-2 font-medium text-[var(--clean-text)]">{isHe ? "שם לקוח" : "Client Name"}</th>
                <th className="px-3 py-2 font-medium text-[var(--clean-text)]">{isHe ? "מספר הזמנות" : "Order Count"}</th>
                <th className="px-3 py-2 font-medium text-[var(--clean-text)]">{isHe ? "סה״כ שולם (₪)" : "Total Paid (₪)"}</th>
              </tr>
            </thead>
            <tbody>
              {clientMetrics.map((row) => (
                <tr key={row.clientId} className="border-b border-[var(--clean-border)] last:border-0">
                  <td className="px-3 py-2 text-[var(--clean-text)]">{row.name}</td>
                  <td className="px-3 py-2 tabular-nums">{row.orderCount}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">{row.totalPaid.toFixed(2)} ₪</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-[var(--clean-border)] bg-white p-5">
          <p className="text-xs font-medium text-[var(--clean-text-secondary)] uppercase tracking-wider mb-1">Total Revenue (Monthly)</p>
          <p className="text-2xl font-semibold text-[var(--clean-text)] tabular-nums">{totalRevenueMonthly.toFixed(2)}</p>
          <p className="text-xs text-[var(--clean-text-secondary)] mt-1">{new Date().toLocaleDateString(locale === "he" ? "he" : "en-US", { month: "long", year: "numeric" })}</p>
        </div>
        <div className="border border-[var(--clean-border)] bg-white p-5">
          <p className="text-xs font-medium text-[var(--clean-text-secondary)] uppercase tracking-wider mb-1">{isHe ? "ממתין לתשלום" : "Pending Payments"}</p>
          <p className="text-2xl font-semibold text-[var(--clean-text)] tabular-nums">{pendingPayments.toFixed(2)}</p>
          <p className="text-xs text-[var(--clean-text-secondary)] mt-1">{isHe ? "חשבוניות לא שולמו" : "Unpaid invoices"}</p>
        </div>
        <div className="border border-[var(--clean-border)] bg-white p-5">
          <p className="text-xs font-medium text-[var(--clean-text-secondary)] uppercase tracking-wider mb-1">{isHe ? "הצעות לסגירה" : "Quotes to Close"}</p>
          <p className="text-2xl font-semibold text-[var(--clean-text)] tabular-nums">{quotesToClose}</p>
          <p className="text-xs text-[var(--clean-text-secondary)] mt-1">{isHe ? "הצעות פעילות" : "Active quotes"}</p>
        </div>
        {overdueCount > 0 && (
          <div className="border border-red-200 bg-red-50/50 p-5">
            <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">{isHe ? "חשבוניות באיחור" : "Overdue Invoices"}</p>
            <p className="text-2xl font-semibold text-red-700 tabular-nums">{overdueCount}</p>
            <p className="text-xs text-[var(--clean-text-secondary)] mt-1">{isHe ? "דורש טיפול" : "Require attention"}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/finances/settings"
          className="flex items-center justify-between p-4 border border-[var(--clean-border)] bg-white hover:bg-[var(--clean-border)]/30 transition-colors"
        >
          <span className="flex items-center gap-3">
            <Hash className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
            <span className="font-medium text-[var(--clean-text)] text-[13px]">{isHe ? "מספור מסמכים" : "Document Numbering"}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
        </Link>
        <Link
          href="/dashboard/finances/documents"
          className="flex items-center justify-between p-4 border border-[var(--clean-border)] bg-white hover:bg-[var(--clean-border)]/30 transition-colors"
        >
          <span className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
            <span className="font-medium text-[var(--clean-text)] text-[13px]">{isHe ? "מסמכים" : "Documents"}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
        </Link>
        <Link
          href="/dashboard/finances/expenses"
          className="flex items-center justify-between p-4 border border-[var(--clean-border)] bg-white hover:bg-[var(--clean-border)]/30 transition-colors"
        >
          <span className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
            <span className="font-medium text-[var(--clean-text)] text-[13px]">{isHe ? "הוצאות" : "Expenses"}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
        </Link>
        <Link
          href="/dashboard/finances/clients"
          className="flex items-center justify-between p-4 border border-[var(--clean-border)] bg-white hover:bg-[var(--clean-border)]/30 transition-colors"
        >
          <span className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
            <span className="font-medium text-[var(--clean-text)] text-[13px]">{isHe ? "לקוחות" : "Clients"}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
        </Link>
        <Link
          href="/dashboard/finances/company-profile"
          className="flex items-center justify-between p-4 border border-[var(--clean-border)] bg-white hover:bg-[var(--clean-border)]/30 transition-colors"
        >
          <span className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
            <span className="font-medium text-[var(--clean-text)] text-[13px]">{isHe ? "פרופיל חברה" : "Company Profile"}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-[var(--clean-text-secondary)]" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}
