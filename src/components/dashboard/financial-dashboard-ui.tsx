"use client";

import React, { useMemo, useState } from "react";
import {
  CreditCard,
  Landmark,
  Smartphone,
  Banknote,
  LayoutGrid,
  Dumbbell,
  Home,
  Car,
  TrendingUp,
  TrendingDown,
  Zap,
  Droplets,
  Building2,
  Receipt,
  Fuel,
  Wrench,
  Shield,
  Milestone,
  Bitcoin,
  PiggyBank,
  LineChart,
  Plus,
} from "lucide-react";
import type {
  FinancialDashboardState,
  SpendChannel,
  HomeFixedType,
  AutoExpenseType,
  InvestmentKind,
} from "@/lib/financial-dashboard-storage";
import { newFinancialId } from "@/lib/financial-dashboard-storage";

const accent = "var(--clean-accent)";
const border = "var(--clean-border)";
const text = "var(--clean-text)";
const muted = "var(--clean-text-secondary)";

function daysInRange(dateStr: string, days: number): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / (86400000);
  return diff >= 0 && diff <= days;
}

const CHANNEL_META: { key: SpendChannel; labelEn: string; labelHe: string; color: string }[] = [
  { key: "credit_card", labelEn: "Credit card", labelHe: "כרטיס אשראי", color: "bg-teal-600" },
  { key: "bank", labelEn: "Bank transfer", labelHe: "העברה בנקאית", color: "bg-slate-600" },
  { key: "bit", labelEn: "Bit", labelHe: "ביט", color: "bg-cyan-600" },
  { key: "cash", labelEn: "Cash", labelHe: "מזומן", color: "bg-emerald-600" },
];

export function FinancialOverview({
  isHe,
  totalDue,
  fd,
  setFd,
}: {
  isHe: boolean;
  totalDue: number;
  fd: FinancialDashboardState;
  setFd: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
}) {
  const [logAmount, setLogAmount] = useState("");
  const [logMerchant, setLogMerchant] = useState("");
  const [logChannel, setLogChannel] = useState<SpendChannel>("credit_card");
  const logExpense = () => {
    const a = parseFloat(logAmount);
    if (!logMerchant.trim() || Number.isNaN(a) || a <= 0) return;
    const date = new Date().toISOString().slice(0, 10);
    setFd((s) => ({
      ...s,
      dailyTransactions: [
        { id: newFinancialId(), channel: logChannel, amount: a, merchant: logMerchant.trim(), date },
        ...s.dailyTransactions,
      ],
    }));
    setLogAmount("");
    setLogMerchant("");
  };
  const last7 = useMemo(() => {
    const by: Record<SpendChannel, number> = {
      credit_card: 0,
      bank: 0,
      bit: 0,
      cash: 0,
    };
    fd.dailyTransactions.forEach((t) => {
      if (daysInRange(t.date, 7)) by[t.channel] += t.amount;
    });
    return by;
  }, [fd.dailyTransactions]);

  const total7 = Object.values(last7).reduce((a, b) => a + b, 0) || 1;
  const recent = useMemo(
    () => [...fd.dailyTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [fd.dailyTransactions]
  );

  const appsMonthly = fd.subscriptions.reduce((s, x) => s + x.monthlyCost, 0);
  const appsYtd = fd.subscriptions.reduce((s, x) => s + x.ytdPaid, 0);
  const memMonthly = fd.memberships.reduce((s, x) => s + x.monthlyCost, 0);
  const homeMonthly = fd.homeFixed.reduce((s, x) => s + x.monthlyAmount, 0);
  const auto30 = fd.autoExpenses.filter((e) => daysInRange(e.date, 30)).reduce((s, x) => s + x.amount, 0);
  const invPL = fd.investments.reduce((s, x) => s + (x.value - x.costBasis), 0);
  const invValue = fd.investments.reduce((s, x) => s + x.value, 0);

  const ChannelIcon = ({ ch }: { ch: SpendChannel }) => {
    if (ch === "credit_card") return <CreditCard className="w-4 h-4" strokeWidth={1.75} />;
    if (ch === "bank") return <Landmark className="w-4 h-4" strokeWidth={1.75} />;
    if (ch === "bit") return <Smartphone className="w-4 h-4" strokeWidth={1.75} />;
    return <Banknote className="w-4 h-4" strokeWidth={1.75} />;
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gradient-to-b from-slate-50/80 to-white space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border p-5 bg-white shadow-sm" style={{ borderColor: border }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: muted }}>
            {isHe ? "חשבונות ממתינים" : "Pending bills"}
          </p>
          <p className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: text }}>
            {totalDue.toFixed(2)} <span className="text-lg font-semibold text-[var(--clean-accent)]">₪</span>
          </p>
        </div>
        <div className="rounded-2xl border p-5 bg-white shadow-sm" style={{ borderColor: border }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: muted }}>
            {isHe ? "הוצאות 7 ימים" : "Spend (7 days)"}
          </p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: text }}>
            {total7.toFixed(0)} <span className="text-lg font-semibold text-[var(--clean-accent)]">₪</span>
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: border }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: text }}>
          <span className="w-8 h-8 rounded-xl bg-[var(--clean-accent)]/10 flex items-center justify-center text-[var(--clean-accent)]">
            <LineChart className="w-4 h-4" strokeWidth={2} />
          </span>
          {isHe ? "הוצאות יומיות לפי ערוץ" : "Daily spend by channel"}
        </h3>
        <p className="text-xs mb-4" style={{ color: muted }}>
          {isHe ? "סיכום 7 ימים אחרונים" : "Last 7 days breakdown"}
        </p>
        <div className="space-y-3">
          {CHANNEL_META.map(({ key, labelEn, labelHe, color }) => {
            const v = last7[key];
            const pct = Math.round((v / total7) * 100);
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium" style={{ color: text }}>
                    <ChannelIcon ch={key} />
                    {isHe ? labelHe : labelEn}
                  </span>
                  <span className="tabular-nums font-semibold" style={{ color: accent }}>
                    {v.toFixed(0)} ₪
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(pct, v > 0 ? 8 : 0)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: border }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: text }}>
          {isHe ? "רישום הוצאה מהיר" : "Quick log expense"}
        </h3>
        <div className="flex flex-wrap gap-2 items-end">
          <select
            value={logChannel}
            onChange={(e) => setLogChannel(e.target.value as SpendChannel)}
            className="border rounded-xl px-3 py-2 text-sm min-w-[140px]"
            style={{ borderColor: border }}
          >
            {CHANNEL_META.map(({ key, labelEn, labelHe }) => (
              <option key={key} value={key}>
                {isHe ? labelHe : labelEn}
              </option>
            ))}
          </select>
          <input
            value={logMerchant}
            onChange={(e) => setLogMerchant(e.target.value)}
            placeholder={isHe ? "תיאור" : "Merchant / note"}
            className="flex-1 min-w-[120px] border rounded-xl px-3 py-2 text-sm"
            style={{ borderColor: border }}
          />
          <input
            type="number"
            value={logAmount}
            onChange={(e) => setLogAmount(e.target.value)}
            placeholder="₪"
            className="w-24 border rounded-xl px-3 py-2 text-sm tabular-nums"
            style={{ borderColor: border }}
          />
          <button
            type="button"
            onClick={logExpense}
            className="px-4 py-2 rounded-xl bg-[var(--clean-accent)] text-white text-sm font-medium"
          >
            {isHe ? "הוסף" : "Add"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: border }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: text }}>
          {isHe ? "תנועות אחרונות" : "Recent activity"}
        </h3>
        <ul className="space-y-2">
          {recent.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50/80 border border-slate-100"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[var(--clean-accent)] shrink-0">
                  <ChannelIcon ch={t.channel} />
                </span>
                <span className="text-[13px] font-medium truncate" style={{ color: text }}>
                  {t.merchant}
                </span>
              </div>
              <div className="text-right shrink-0 ms-2">
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: text }}>
                  −{t.amount.toFixed(0)} ₪
                </span>
                <p className="text-[10px]" style={{ color: muted }}>
                  {t.date}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: border }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: text }}>
          {isHe ? "סיכומים מהירים" : "At-a-glance summaries"}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <SummaryPill
            icon={<LayoutGrid className="w-4 h-4" />}
            label={isHe ? "אפליקציות" : "Apps / subs"}
            primary={`${appsMonthly.toFixed(0)} ₪/mo`}
            sub={isHe ? `שנה: ${appsYtd.toFixed(0)}` : `YTD ${appsYtd.toFixed(0)}`}
          />
          <SummaryPill
            icon={<Dumbbell className="w-4 h-4" />}
            label={isHe ? "מנויים" : "Memberships"}
            primary={`${memMonthly.toFixed(0)} ₪/mo`}
            sub={isHe ? "חודשי" : "Monthly"}
          />
          <SummaryPill
            icon={<Home className="w-4 h-4" />}
            label={isHe ? "בית קבוע" : "Home fixed"}
            primary={`${homeMonthly.toFixed(0)} ₪`}
            sub={isHe ? "לחודש" : "Per month"}
          />
          <SummaryPill
            icon={<Car className="w-4 h-4" />}
            label={isHe ? "רכב (30 יום)" : "Auto (30d)"}
            primary={`${auto30.toFixed(0)} ₪`}
            sub={isHe ? "הוצאות" : "Expenses"}
          />
          <SummaryPill
            icon={invPL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            label={isHe ? "השקעות" : "Investments"}
            primary={`${invValue.toLocaleString()} ₪`}
            sub={
              <span className={invPL >= 0 ? "text-emerald-600" : "text-red-600"}>
                P/L {invPL >= 0 ? "+" : ""}
                {invPL.toFixed(0)} ₪
              </span>
            }
          />
        </div>
      </section>

      <p className="text-xs text-center pb-2" style={{ color: muted }}>
        {isHe ? "נתונים נשמרים במכשיר · לחשבוניות מלאות עבור ללשונית חשבוניות" : "Data saved on device · Use Invoices tab for documents"}
      </p>
    </div>
  );
}

function SummaryPill({
  icon,
  label,
  primary,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  sub: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-3 bg-slate-50/50 hover:bg-[var(--clean-accent)]/5 transition-colors" style={{ borderColor: border }}>
      <div className="flex items-center gap-2 text-[var(--clean-accent)] mb-1">{icon}</div>
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: muted }}>
        {label}
      </p>
      <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: text }}>
        {primary}
      </p>
      <div className="text-[11px] mt-0.5">{sub}</div>
    </div>
  );
}

export function AppsSubscriptionsTab({
  isHe,
  fd,
  setFd,
}: {
  isHe: boolean;
  fd: FinancialDashboardState;
  setFd: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
}) {
  const cancel = (id: string) => {
    setFd((s) => ({ ...s, subscriptions: s.subscriptions.filter((x) => x.id !== id) }));
  };
  const [newName, setNewName] = useState("");
  const [newMo, setNewMo] = useState("");
  const [newYtd, setNewYtd] = useState("");
  const addSub = () => {
    const mo = parseFloat(newMo);
    const ytd = parseFloat(newYtd) || 0;
    if (!newName.trim() || Number.isNaN(mo) || mo < 0) return;
    setFd((s) => ({
      ...s,
      subscriptions: [...s.subscriptions, { id: newFinancialId(), name: newName.trim(), monthlyCost: mo, ytdPaid: ytd }],
    }));
    setNewName("");
    setNewMo("");
    setNewYtd("");
  };
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gradient-to-b from-violet-50/40 to-white">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-lg">
          <LayoutGrid className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: text }}>
            {isHe ? "אפליקציות ומנויים" : "Apps & subscriptions"}
          </h3>
          <p className="text-xs" style={{ color: muted }}>
            {isHe ? "נטפליקס, אדובי, iCloud ועוד" : "Netflix, Adobe, iCloud & more"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-2xl border bg-white/90" style={{ borderColor: border }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={isHe ? "שירות" : "Service name"}
          className="flex-1 min-w-[140px] border rounded-xl px-3 py-2 text-sm"
          style={{ borderColor: border }}
        />
        <input
          type="number"
          value={newMo}
          onChange={(e) => setNewMo(e.target.value)}
          placeholder={isHe ? "חודשי ₪" : "Monthly ₪"}
          className="w-28 border rounded-xl px-3 py-2 text-sm tabular-nums"
          style={{ borderColor: border }}
        />
        <input
          type="number"
          value={newYtd}
          onChange={(e) => setNewYtd(e.target.value)}
          placeholder={isHe ? "YTD ₪" : "YTD paid ₪"}
          className="w-28 border rounded-xl px-3 py-2 text-sm tabular-nums"
          style={{ borderColor: border }}
        />
        <button
          type="button"
          onClick={addSub}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[var(--clean-accent)] text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {isHe ? "הוסף מנוי" : "Add subscription"}
        </button>
      </div>
      <div className="space-y-3">
        {fd.subscriptions.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ borderColor: border }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: text }}>
                {s.name}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm" style={{ color: muted }}>
                <span>
                  {isHe ? "חודשי: " : "Monthly: "}
                  <strong className="text-[var(--clean-accent)] tabular-nums">{s.monthlyCost.toFixed(2)} ₪</strong>
                </span>
                <span>
                  {isHe ? "שולם השנה: " : "Paid YTD: "}
                  <strong className="tabular-nums" style={{ color: text }}>
                    {s.ytdPaid.toFixed(2)} ₪
                  </strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => cancel(s.id)}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              {isHe ? "בטל מנוי" : "Cancel subscription"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MembershipsTab({
  isHe,
  fd,
  setFd,
}: {
  isHe: boolean;
  fd: FinancialDashboardState;
  setFd: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
}) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const add = () => {
    const n = parseFloat(cost);
    if (!name.trim() || isNaN(n)) return;
    setFd((s) => ({
      ...s,
      memberships: [...s.memberships, { id: newFinancialId(), name: name.trim(), monthlyCost: n }],
    }));
    setName("");
    setCost("");
  };
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gradient-to-b from-amber-50/30 to-white">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg">
          <Dumbbell className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: text }}>
            {isHe ? "מנויים לייףסטייל" : "Memberships"}
          </h3>
          <p className="text-xs" style={{ color: muted }}>
            {isHe ? "חדר כושר, בריכה, שטיפת רכב" : "Gym, pool, car wash"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border bg-white" style={{ borderColor: border }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isHe ? "שם" : "Name"}
          className="flex-1 min-w-[120px] border px-3 py-2 text-sm rounded-xl"
          style={{ borderColor: border }}
        />
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder={isHe ? "חודשי ₪" : "Monthly ₪"}
          className="w-28 border px-3 py-2 text-sm rounded-xl tabular-nums"
          style={{ borderColor: border }}
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[var(--clean-accent)] text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {isHe ? "הוסף" : "Add"}
        </button>
      </div>
      <ul className="space-y-2">
        {fd.memberships.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between p-4 rounded-2xl border bg-white shadow-sm"
            style={{ borderColor: border }}
          >
            <div>
              <p className="font-semibold" style={{ color: text }}>
                {m.name}
              </p>
              {m.note && (
                <p className="text-xs mt-0.5" style={{ color: muted }}>
                  {m.note}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tabular-nums text-[var(--clean-accent)]">{m.monthlyCost.toFixed(0)} ₪/mo</span>
              <button
                type="button"
                onClick={() => setFd((s) => ({ ...s, memberships: s.memberships.filter((x) => x.id !== m.id) }))}
                className="text-xs px-2 py-1 rounded-lg border text-red-600 border-red-200 hover:bg-red-50"
              >
                {isHe ? "הסר" : "Remove"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const HOME_ICONS: Record<HomeFixedType, React.ReactNode> = {
  electricity: <Zap className="w-5 h-5" />,
  water: <Droplets className="w-5 h-5" />,
  rent: <Home className="w-5 h-5" />,
  arnona: <Building2 className="w-5 h-5" />,
};

export function HomeFixedTab({
  isHe,
  fd,
  setFd,
}: {
  isHe: boolean;
  fd: FinancialDashboardState;
  setFd: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
}) {
  const labels: Record<HomeFixedType, { en: string; he: string }> = {
    electricity: { en: "Electricity", he: "חשמל" },
    water: { en: "Water", he: "מים" },
    rent: { en: "Rent / Mortgage", he: "שכירות / משכנתא" },
    arnona: { en: "Arnona", he: "ארנונה" },
  };
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gradient-to-b from-teal-50/40 to-white">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-lg">
          <Home className="w-6 h-6" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: text }}>
            {isHe ? "בית — עלויות קבועות" : "Home — fixed costs"}
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fd.homeFixed.map((h) => (
          <div
            key={h.id}
            className="rounded-2xl border p-4 bg-white shadow-sm flex gap-4 items-start"
            style={{ borderColor: border }}
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--clean-accent)]/10 flex items-center justify-center text-[var(--clean-accent)] shrink-0">
              {HOME_ICONS[h.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>
                {isHe ? labels[h.type].he : labels[h.type].en}
              </p>
              <p className="font-semibold mt-0.5" style={{ color: text }}>
                {h.label}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={h.monthlyAmount}
                  key={h.id + String(h.monthlyAmount)}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isNaN(v) || v < 0) return;
                    setFd((s) => ({
                      ...s,
                      homeFixed: s.homeFixed.map((x) => (x.id === h.id ? { ...x, monthlyAmount: v } : x)),
                    }));
                  }}
                  className="text-xl font-bold tabular-nums text-[var(--clean-accent)] border rounded-lg px-2 py-1 w-32 max-w-full"
                  style={{ borderColor: border }}
                />
                <span className="text-sm font-medium text-[var(--clean-accent)]">₪</span>
              </div>
              <p className="text-xs mt-1" style={{ color: muted }}>
                {isHe ? "לחודש · ערוך ולחץ מחוץ לשדה" : "per month · edit & blur to save"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const AUTO_META: Record<AutoExpenseType, { Icon: typeof Fuel; labelEn: string; labelHe: string }> = {
  fuel: { Icon: Fuel, labelEn: "Fuel", labelHe: "דלק" },
  repair: { Icon: Wrench, labelEn: "Repairs", labelHe: "תיקונים" },
  insurance: { Icon: Shield, labelEn: "Insurance", labelHe: "ביטוח" },
  tolls: { Icon: Milestone, labelEn: "Tolls", labelHe: "כבישי אגרה" },
};

export function AutoTab({
  isHe,
  fd,
  setFd,
}: {
  isHe: boolean;
  fd: FinancialDashboardState;
  setFd: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
}) {
  const [atype, setAtype] = useState<AutoExpenseType>("fuel");
  const [alabel, setAlabel] = useState("");
  const [aamt, setAamt] = useState("");
  const [adate, setAdate] = useState(() => new Date().toISOString().slice(0, 10));
  const byType = useMemo(() => {
    const m: Record<AutoExpenseType, typeof fd.autoExpenses> = {
      fuel: [],
      repair: [],
      insurance: [],
      tolls: [],
    };
    fd.autoExpenses.forEach((e) => m[e.type].push(e));
    return m;
  }, [fd.autoExpenses]);

  const addAuto = () => {
    const amt = parseFloat(aamt);
    if (!alabel.trim() || Number.isNaN(amt) || amt <= 0) return;
    setFd((s) => ({
      ...s,
      autoExpenses: [
        ...s.autoExpenses,
        { id: newFinancialId(), type: atype, label: alabel.trim(), amount: amt, date: adate },
      ],
    }));
    setAlabel("");
    setAamt("");
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gradient-to-b from-slate-100/80 to-white">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center text-white shadow-xl">
          <Car className="w-7 h-7" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ color: text }}>
            {isHe ? "רכב" : "Auto"}
          </h3>
          <p className="text-xs" style={{ color: muted }}>
            {isHe ? "דלק, תיקונים, ביטוח, אגרות" : "Fuel, repairs, insurance, tolls"}
          </p>
        </div>
      </div>
      <div className="mb-6 p-4 rounded-2xl border bg-white shadow-sm flex flex-wrap gap-2 items-end" style={{ borderColor: border }}>
        <select
          value={atype}
          onChange={(e) => setAtype(e.target.value as AutoExpenseType)}
          className="border rounded-xl px-3 py-2 text-sm"
          style={{ borderColor: border }}
        >
          {(Object.keys(AUTO_META) as AutoExpenseType[]).map((t) => (
            <option key={t} value={t}>
              {isHe ? AUTO_META[t].labelHe : AUTO_META[t].labelEn}
            </option>
          ))}
        </select>
        <input
          value={alabel}
          onChange={(e) => setAlabel(e.target.value)}
          placeholder={isHe ? "תיאור" : "Description"}
          className="flex-1 min-w-[120px] border rounded-xl px-3 py-2 text-sm"
          style={{ borderColor: border }}
        />
        <input
          type="number"
          value={aamt}
          onChange={(e) => setAamt(e.target.value)}
          placeholder="₪"
          className="w-24 border rounded-xl px-3 py-2 text-sm tabular-nums"
          style={{ borderColor: border }}
        />
        <input
          type="date"
          value={adate}
          onChange={(e) => setAdate(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm"
          style={{ borderColor: border }}
        />
        <button
          type="button"
          onClick={addAuto}
          className="px-4 py-2 rounded-xl bg-[var(--clean-accent)] text-white text-sm font-medium"
        >
          {isHe ? "הוסף" : "Add"}
        </button>
      </div>
      {(Object.keys(AUTO_META) as AutoExpenseType[]).map((type) => {
        const { Icon, labelEn, labelHe } = AUTO_META[type];
        const list = byType[type];
        return (
          <section key={type} className="mb-5">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: text }}>
              <Icon className="w-4 h-4 text-[var(--clean-accent)]" strokeWidth={2} />
              {isHe ? labelHe : labelEn}
            </h4>
            {list.length === 0 ? (
              <p className="text-sm py-3 px-4 rounded-xl border border-dashed bg-slate-50/50" style={{ color: muted }}>
                {isHe ? "אין רשומות — הוסף למעלה" : "No entries yet — add above"}
              </p>
            ) : (
              <ul className="space-y-2">
                {list.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 py-3 px-4 rounded-xl border bg-white flex-wrap sm:flex-nowrap"
                    style={{ borderColor: border }}
                  >
                    <span className="text-sm font-medium flex-1 min-w-[100px]" style={{ color: text }}>
                      {e.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold tabular-nums text-[var(--clean-accent)]">
                        {e.amount.toFixed(0)} ₪
                      </span>
                      <span className="text-xs tabular-nums w-[86px] text-end" style={{ color: muted }}>
                        {e.date}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFd((s) => ({ ...s, autoExpenses: s.autoExpenses.filter((x) => x.id !== e.id) }))
                        }
                        className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg"
                        aria-label={isHe ? "מחק" : "Delete"}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

const INV_ICON: Record<InvestmentKind, React.ReactNode> = {
  stock: <LineChart className="w-5 h-5" />,
  crypto: <Bitcoin className="w-5 h-5" />,
  savings: <PiggyBank className="w-5 h-5" />,
};

export function InvestmentsTab({
  isHe,
  fd,
  setFd,
}: {
  isHe: boolean;
  fd: FinancialDashboardState;
  setFd: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
}) {
  const totalPL = fd.investments.reduce((s, x) => s + (x.value - x.costBasis), 0);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-gradient-to-b from-emerald-50/30 to-white">
      <div className="rounded-2xl border p-5 mb-5 bg-white shadow-sm" style={{ borderColor: border }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>
          {isHe ? "רווח / הפסד כולל" : "Total profit / loss"}
        </p>
        <p className={`text-3xl font-bold tabular-nums mt-1 ${totalPL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {totalPL >= 0 ? "+" : ""}
          {totalPL.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₪
        </p>
      </div>
      <div className="space-y-3">
        {fd.investments.map((inv) => {
          const pl = inv.value - inv.costBasis;
          const pct = inv.costBasis ? (pl / inv.costBasis) * 100 : 0;
          return (
            <div
              key={inv.id}
              className="rounded-2xl border p-4 bg-white shadow-sm flex gap-4"
              style={{ borderColor: border }}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                {INV_ICON[inv.kind]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ color: text }}>
                  {inv.name}
                </p>
                <p className="text-xs capitalize mt-0.5" style={{ color: muted }}>
                  {inv.kind}
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-sm items-center">
                  <label className="flex items-center gap-1" style={{ color: muted }}>
                    {isHe ? "שווי" : "Value"}
                    <input
                      type="number"
                      defaultValue={inv.value}
                      key={inv.id + "-v" + inv.value}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isNaN(v) || v < 0) return;
                        setFd((s) => ({
                          ...s,
                          investments: s.investments.map((x) => (x.id === inv.id ? { ...x, value: v } : x)),
                        }));
                      }}
                      className="w-24 border rounded-lg px-2 py-1 tabular-nums text-[var(--clean-text)]"
                      style={{ borderColor: border }}
                    />
                  </label>
                  <label className="flex items-center gap-1" style={{ color: muted }}>
                    {isHe ? "עלות" : "Cost"}
                    <input
                      type="number"
                      defaultValue={inv.costBasis}
                      key={inv.id + "-c" + inv.costBasis}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isNaN(v) || v < 0) return;
                        setFd((s) => ({
                          ...s,
                          investments: s.investments.map((x) => (x.id === inv.id ? { ...x, costBasis: v } : x)),
                        }));
                      }}
                      className="w-24 border rounded-lg px-2 py-1 tabular-nums text-[var(--clean-text)]"
                      style={{ borderColor: border }}
                    />
                  </label>
                  <span className={pl >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                    P/L {pl >= 0 ? "+" : ""}
                    {pl.toFixed(0)} ₪ ({pct >= 0 ? "+" : ""}
                    {pct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
