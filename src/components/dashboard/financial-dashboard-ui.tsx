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
  Fuel,
  Wrench,
  Shield,
  Milestone,
  Bitcoin,
  PiggyBank,
  LineChart,
  Plus,
  ChevronDown,
  ChevronUp,
  Receipt,
  Utensils,
  ShoppingBag,
} from "lucide-react";
import type {
  FinancialDashboardState,
  SpendChannel,
  HomeFixedType,
  AutoExpenseType,
  InvestmentKind,
  DailyTransaction,
} from "@/lib/financial-dashboard-storage";
import { newFinancialId } from "@/lib/financial-dashboard-storage";
import type { BillEntry } from "@/contexts/BillsContext";

const teal = "#0d9488";
/** Ollin brand turquoise — income & positive net in overview */
const BRAND_TURQUOISE = "#008080";
const slateBlue = "#475569";
const slateLight = "#64748b";

function daysInRange(dateStr: string, days: number): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 86400000;
  return diff >= 0 && diff <= days;
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Last `days` calendar days (index 0 = oldest), daily spend totals from transactions. */
function dailySpendSeries(
  txns: { date: string; amount: number }[],
  days: number
): number[] {
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date();
    t.setDate(t.getDate() - i);
    const key = dateStr(t);
    const sum = txns.filter((x) => x.date === key).reduce((s, x) => s + x.amount, 0);
    out.push(sum);
  }
  return out;
}

const CHANNEL_META: {
  key: SpendChannel;
  labelEn: string;
  labelHe: string;
  hex: string;
}[] = [
  { key: "credit_card", labelEn: "Card", labelHe: "אשראי", hex: teal },
  { key: "bank", labelEn: "Bank", labelHe: "בנק", hex: slateBlue },
  { key: "bit", labelEn: "Bit", labelHe: "ביט", hex: "#0891b2" },
  { key: "cash", labelEn: "Cash", labelHe: "מזומן", hex: "#059669" },
];

function Sparkline({ data, w = 72, h = 22 }: { data: number[]; w?: number; h?: number }) {
  const vals = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const step = vals.length > 1 ? (w - 4) / (vals.length - 1) : 0;
  const pts = vals
    .map((v, i) => {
      const x = 2 + i * step;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        fill="none"
        stroke={teal}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

function ProgressMicro({
  value,
  cap,
  color = teal,
}: {
  value: number;
  cap: number;
  color?: string;
}) {
  const pct = cap > 0 ? Math.min(100, (value / cap) * 100) : 0;
  return (
    <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SparklineMono({
  data,
  color,
  w = 72,
  h = 22,
}: {
  data: number[];
  color: string;
  w?: number;
  h?: number;
}) {
  const vals = data.length ? data : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const step = vals.length > 1 ? (w - 4) / (vals.length - 1) : 0;
  const pts = vals
    .map((v, i) => {
      const x = 2 + i * step;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

function FxCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-white border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

function ChannelIcon({ ch }: { ch: SpendChannel }) {
  if (ch === "credit_card") return <CreditCard className="w-3.5 h-3.5" strokeWidth={2} />;
  if (ch === "bank") return <Landmark className="w-3.5 h-3.5" strokeWidth={2} />;
  if (ch === "bit") return <Smartphone className="w-3.5 h-3.5" strokeWidth={2} />;
  return <Banknote className="w-3.5 h-3.5" strokeWidth={2} />;
}

function SubBrandIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  const box = "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0";
  if (n.includes("netflix")) return <div className={`${box} bg-[#E50914]`}>N</div>;
  if (n.includes("spotify")) return <div className={`${box} bg-[#1DB954]`}>S</div>;
  if (n.includes("adobe")) return <div className={`${box} bg-[#FF0000]`}>A</div>;
  if (n.includes("icloud") || n.includes("apple"))
    return <div className={`${box} bg-slate-700`}></div>;
  if (n.includes("microsoft") || n.includes("365")) return <div className={`${box} bg-[#0078D4]`}>M</div>;
  return (
    <div className={`${box} bg-gradient-to-br from-slate-500 to-slate-700`}>{name.slice(0, 1).toUpperCase()}</div>
  );
}

function billsDueWithinDays(bills: BillEntry[], days: number): number {
  const t = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  const a = dateStr(t);
  const b = dateStr(end);
  return bills.filter((x) => x.status === "pending" && x.dueDate >= a && x.dueDate <= b).length;
}

const financeRoot =
  "flex-1 min-h-0 overflow-y-auto font-[Inter,ui-sans-serif,system-ui,sans-serif] text-[12px] leading-tight bg-white text-slate-800 antialiased";

/** Top-level spend / transaction grouping (matches expense + transaction sections). */
type ParentCat = "food" | "transport" | "rent" | "shopping" | "other";

const PARENT_ORDER: ParentCat[] = ["food", "transport", "rent", "shopping", "other"];

const GROUP_SECTION_TITLES: Record<ParentCat, { en: string; he: string }> = {
  food: { en: "Food & Dining", he: "מזון ומסעדות" },
  transport: { en: "Transport", he: "תחבורה" },
  rent: { en: "Housing & Rent", he: "דיור ושכירות" },
  shopping: { en: "Shopping", he: "קניות" },
  other: { en: "Bills & Other", he: "חשבונות ואחר" },
};

const CAT_LABELS: Record<ParentCat, { en: string; he: string }> = {
  food: { en: "Food", he: "מזון" },
  transport: { en: "Transport", he: "תחבורה" },
  rent: { en: "Rent", he: "שכירות" },
  shopping: { en: "Shopping", he: "קניות" },
  other: { en: "Other", he: "אחר" },
};

/** Infer parent + sub-category from merchant (dynamic sub-labels for lists). */
function classifyMerchant(merchant: string): { parent: ParentCat; subEn: string; subHe: string } {
  const m = merchant.toLowerCase();
  let parent: ParentCat = "other";
  let subEn = "General";
  let subHe = "כללי";

  if (
    /supermarket|grocery|market|food|restaurant|cafe|coffee|bakery|dining|delivery|wolt|uber\s*eats|pizza|sushi|bistro|grill/.test(
      m
    )
  ) {
    parent = "food";
    if (/coffee|cafe|starbucks/.test(m)) {
      subEn = "Cafés & coffee";
      subHe = "בתי קפה";
    } else if (/supermarket|grocery|shufersal|victory|rami|ketzoet/.test(m)) {
      subEn = "Supermarkets";
      subHe = "סופרמרקטים";
    } else if (/restaurant|bistro|grill|dining/.test(m)) {
      subEn = "Restaurants";
      subHe = "מסעדות";
    } else if (/delivery|wolt|uber\s*eats/.test(m)) {
      subEn = "Deliveries";
      subHe = "משלוחים";
    } else {
      subEn = "Groceries & other food";
      subHe = "מכולת ומזון";
    }
  } else if (/fuel|parking|toll|highway|gas|uber|taxi|station|car wash|vehicle/.test(m)) {
    parent = "transport";
    if (/fuel|gas|station|diesel|petrol/.test(m)) {
      subEn = "Fuel";
      subHe = "דלק";
    } else if (/parking/.test(m)) {
      subEn = "Parking";
      subHe = "חניה";
    } else if (/toll|highway/.test(m)) {
      subEn = "Tolls";
      subHe = "אגרות";
    } else if (/uber|taxi|bus|train|transit/.test(m)) {
      subEn = "Transit";
      subHe = "תחבורה ציבורית";
    } else {
      subEn = "Vehicle & transport";
      subHe = "רכב ותנועה";
    }
  } else if (/^rent|rent transfer|lease|landlord|דיור/.test(m)) {
    parent = "rent";
    subEn = "Rent & lease";
    subHe = "שכירות";
  } else if (
    /electronic|tech|computer|phone|gadget|amazon|mall|shopping|online|order|retail|cloth|apparel|fashion|zara|shein|wear|h&m/.test(
      m
    )
  ) {
    parent = "shopping";
    if (/cloth|apparel|fashion|zara|shein|wear|h&m/.test(m)) {
      subEn = "Clothing";
      subHe = "ביגוד";
    } else if (/electronic|tech|computer|phone|gadget|apple|samsung/.test(m)) {
      subEn = "Electronics";
      subHe = "אלקטרוניקה";
    } else if (/online|amazon|order|ebay|aliexpress/.test(m)) {
      subEn = "Online retail";
      subHe = "קניות מקוונות";
    } else {
      subEn = "Retail";
      subHe = "קמעונאות";
    }
  }
  return { parent, subEn, subHe };
}

function autoExpenseParentSub(type: AutoExpenseType): { parent: ParentCat; subEn: string; subHe: string } {
  if (type === "fuel") return { parent: "transport", subEn: "Fuel", subHe: "דלק" };
  if (type === "tolls") return { parent: "transport", subEn: "Tolls", subHe: "אגרות" };
  if (type === "repair") return { parent: "transport", subEn: "Repairs", subHe: "תיקונים" };
  return { parent: "other", subEn: "Insurance & fees", subHe: "ביטוחים ועמלות" };
}

type MergedOverviewTxn = {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  parent: ParentCat;
  kind: "daily" | "auto";
  channel: SpendChannel;
  autoType?: AutoExpenseType;
};

function TransactionRowIcon({
  kind,
  channel,
  autoType,
}: {
  kind: "daily" | "auto";
  channel: SpendChannel;
  autoType?: AutoExpenseType;
}) {
  const cls = "w-3.5 h-3.5 text-slate-400 shrink-0";
  if (kind === "daily") {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-slate-50">
        <ChannelIcon ch={channel} />
      </span>
    );
  }
  if (autoType === "fuel") return <Fuel className={cls} strokeWidth={2} />;
  if (autoType === "tolls") return <Milestone className={cls} strokeWidth={2} />;
  if (autoType === "repair") return <Wrench className={cls} strokeWidth={2} />;
  return <Shield className={cls} strokeWidth={2} />;
}

export function MinimalFinancialOverview({
  isHe,
  fd,
  privacyMode,
}: {
  isHe: boolean;
  fd: FinancialDashboardState;
  privacyMode: boolean;
}) {
  const [rangeMode, setRangeMode] = useState<"monthly" | "yearly" | "custom">("monthly");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return dateStr(d);
  });
  const [customTo, setCustomTo] = useState(() => dateStr(new Date()));

  const resolvedRange = useMemo(() => {
    const now = new Date();
    if (rangeMode === "monthly") {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { fromIso: dateStr(from), toIso: dateStr(now) };
    }
    if (rangeMode === "yearly") {
      const from = new Date(now);
      from.setDate(from.getDate() - 365);
      return { fromIso: dateStr(from), toIso: dateStr(now) };
    }
    // custom
    const fromIso = customFrom || dateStr(new Date(now.getTime() - 30 * 86400000));
    const toIso = customTo || dateStr(now);
    if (fromIso <= toIso) return { fromIso, toIso };
    return { fromIso: toIso, toIso: fromIso };
  }, [rangeMode, customFrom, customTo]);

  const rangeDays = useMemo(() => {
    const a = new Date(resolvedRange.fromIso);
    const b = new Date(resolvedRange.toIso);
    const diff = Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
    return Math.max(1, diff);
  }, [resolvedRange.fromIso, resolvedRange.toIso]);

  const prevRange = useMemo(() => {
    const from = new Date(resolvedRange.fromIso);
    const to = new Date(resolvedRange.toIso);
    const ms = Math.max(1, rangeDays) * 86400000;
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - ms + 86400000);
    return { fromIso: dateStr(prevFrom), toIso: dateStr(prevTo) };
  }, [rangeDays, resolvedRange.fromIso, resolvedRange.toIso]);

  const inRangeIso = useMemo(() => {
    const { fromIso, toIso } = resolvedRange;
    return (iso: string) => iso >= fromIso && iso <= toIso;
  }, [resolvedRange]);

  const inPrevRangeIso = useMemo(() => {
    const { fromIso, toIso } = prevRange;
    return (iso: string) => iso >= fromIso && iso <= toIso;
  }, [prevRange]);

  const recurringMonthly =
    fd.subscriptions.reduce((s, x) => s + x.monthlyCost, 0) +
    fd.memberships.reduce((s, x) => s + x.monthlyCost, 0) +
    fd.homeFixed.reduce((s, x) => s + x.monthlyAmount, 0);

  const variableSpend = useMemo(() => {
    const daily = fd.dailyTransactions.reduce((s, t) => (inRangeIso(t.date) ? s + t.amount : s), 0);
    const auto = fd.autoExpenses.reduce((s, e) => (inRangeIso(e.date) ? s + e.amount : s), 0);
    return daily + auto;
  }, [fd.dailyTransactions, fd.autoExpenses, inRangeIso]);

  const prevVariableSpend = useMemo(() => {
    const daily = fd.dailyTransactions.reduce((s, t) => (inPrevRangeIso(t.date) ? s + t.amount : s), 0);
    const auto = fd.autoExpenses.reduce((s, e) => (inPrevRangeIso(e.date) ? s + e.amount : s), 0);
    return daily + auto;
  }, [fd.dailyTransactions, fd.autoExpenses, inPrevRangeIso]);

  const recurringForRange = recurringMonthly * (rangeDays / 30);
  const recurringForPrev = recurringMonthly * (rangeDays / 30);
  const spendNow = recurringForRange + variableSpend;
  const spendPrev = recurringForPrev + prevVariableSpend;

  const invPL = fd.investments.reduce((s, x) => s + (x.value - x.costBasis), 0);
  const income = invPL > 0 ? invPL : 0;
  const investmentLossAsExpense = invPL < 0 ? Math.abs(invPL) : 0;
  const expenses = spendNow + investmentLossAsExpense;
  const netGap = income - expenses;

  const netSeries7 = useMemo(() => {
    const days = 7;
    const incomePerDay = income / days;
    const lossPerDay = investmentLossAsExpense / days;
    const out: number[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const t = new Date(now);
      t.setDate(t.getDate() - i);
      const iso = dateStr(t);
      const dayDaily = fd.dailyTransactions.filter((x) => x.date === iso).reduce((s, x) => s + x.amount, 0);
      const dayAuto = fd.autoExpenses.filter((x) => x.date === iso).reduce((s, x) => s + x.amount, 0);
      const net = incomePerDay - (dayDaily + dayAuto + lossPerDay);
      out.push(net);
    }
    return out;
  }, [fd.dailyTransactions, fd.autoExpenses, income, investmentLossAsExpense]);

  /** Portfolio / holdings total as “account balance” proxy (no bank field in model). */
  const totalBalance = useMemo(
    () => fd.investments.reduce((s, x) => s + x.value, 0),
    [fd.investments]
  );
  const totalBalanceColor = totalBalance > 0 ? BRAND_TURQUOISE : "#0f172a";

  const mergedRecentTxns = useMemo((): MergedOverviewTxn[] => {
    const daily: MergedOverviewTxn[] = fd.dailyTransactions
      .filter((t) => inRangeIso(t.date))
      .map((t) => ({
        id: t.id,
        merchant: t.merchant,
        date: t.date,
        amount: t.amount,
        parent: classifyMerchant(t.merchant).parent,
        kind: "daily" as const,
        channel: t.channel,
      }));
    const auto: MergedOverviewTxn[] = fd.autoExpenses
      .filter((e) => inRangeIso(e.date))
      .map((e) => {
        const ps = autoExpenseParentSub(e.type);
        return {
          id: e.id,
          merchant: e.label,
          date: e.date,
          amount: e.amount,
          parent: ps.parent,
          kind: "auto" as const,
          channel: "bank" as SpendChannel,
          autoType: e.type,
        };
      });
    return [...daily, ...auto].sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount).slice(0, 28);
  }, [fd.dailyTransactions, fd.autoExpenses, inRangeIso]);

  const groupedRecentTxns = useMemo(() => {
    const map = new Map<ParentCat, MergedOverviewTxn[]>();
    for (const cat of PARENT_ORDER) map.set(cat, []);
    for (const t of mergedRecentTxns) {
      map.get(t.parent)!.push(t);
    }
    for (const cat of PARENT_ORDER) {
      const arr = map.get(cat)!;
      arr.sort((a, b) => b.date.localeCompare(a.date));
    }
    return PARENT_ORDER.filter((cat) => (map.get(cat)?.length ?? 0) > 0).map((cat) => ({
      cat,
      title: isHe ? GROUP_SECTION_TITLES[cat].he : GROUP_SECTION_TITLES[cat].en,
      items: map.get(cat)!,
    }));
  }, [mergedRecentTxns, isHe]);

  const pctDelta = useMemo(() => {
    if (spendPrev <= 0) return 0;
    return ((spendPrev - spendNow) / spendPrev) * 100;
  }, [spendNow, spendPrev]);

  const summary = useMemo(() => {
    const absPct = Math.abs(Math.round(pctDelta));
    if (!spendPrev || spendPrev <= 0 || Number.isNaN(absPct)) {
      return isHe ? "ההוצאה שלך בשליטה. המשך כך!" : "Your spending is on track. Keep it up!";
    }
    if (pctDelta >= 0) {
      if (rangeMode === "monthly") return isHe ? `הוצאת ${absPct}% פחות מהחודש הקודם. כל הכבוד!` : `You spent ${absPct}% less than last month. Keep it up!`;
      if (rangeMode === "yearly") return isHe ? `הוצאת ${absPct}% פחות מהשנה הקודמת. כל הכבוד!` : `You spent ${absPct}% less than last year. Keep it up!`;
      return isHe ? `הוצאת ${absPct}% פחות מהתקופה הקודמת. כל הכבוד!` : `You spent ${absPct}% less than the previous period. Keep it up!`;
    }
    if (rangeMode === "monthly") return isHe ? `הוצאת ${absPct}% יותר מהחודש הקודם.` : `You spent ${absPct}% more than last month.`;
    if (rangeMode === "yearly") return isHe ? `הוצאת ${absPct}% יותר מהשנה הקודמת.` : `You spent ${absPct}% more than last year.`;
    return isHe ? `הוצאת ${absPct}% יותר מהתקופה הקודמת.` : `You spent ${absPct}% more than the previous period.`;
  }, [pctDelta, spendPrev, rangeMode, isHe]);

  const amountBlur = privacyMode ? "blur-[3px] select-none" : "";

  const incomeText = income;
  const expensesText = expenses;

  const netDisplayColor = netGap >= 0 ? BRAND_TURQUOISE : "#475569";
  const expensesAccent = "#f43f5e";

  const expenseCategoryBreakdown = useMemo(() => {
    type Agg = { total: number; subSpend: Map<string, { en: string; he: string; amt: number }> };
    const byParent = new Map<ParentCat, Agg>();
    for (const p of PARENT_ORDER) byParent.set(p, { total: 0, subSpend: new Map() });

    const add = (parent: ParentCat, subEn: string, subHe: string, amt: number) => {
      const agg = byParent.get(parent)!;
      agg.total += amt;
      const key = `${subEn}||${subHe}`;
      const prev = agg.subSpend.get(key);
      if (prev) prev.amt += amt;
      else agg.subSpend.set(key, { en: subEn, he: subHe, amt });
    };

    fd.dailyTransactions.forEach((t) => {
      if (!inRangeIso(t.date)) return;
      const { parent, subEn, subHe } = classifyMerchant(t.merchant);
      add(parent, subEn, subHe, t.amount);
    });
    fd.autoExpenses.forEach((e) => {
      if (!inRangeIso(e.date)) return;
      const ps = autoExpenseParentSub(e.type);
      add(ps.parent, ps.subEn, ps.subHe, e.amount);
    });
    const factor = rangeDays / 30;
    const homeLabels: Record<HomeFixedType, { en: string; he: string }> = {
      electricity: { en: "Electricity", he: "חשמל" },
      water: { en: "Water", he: "מים" },
      rent: { en: "Rent (fixed)", he: "שכירות (קבוע)" },
      arnona: { en: "Arnona", he: "ארנונה" },
    };
    fd.homeFixed.forEach((h) => {
      const amt = h.monthlyAmount * factor;
      const lab = homeLabels[h.type];
      if (h.type === "rent") add("rent", lab.en, lab.he, amt);
      else add("other", lab.en, lab.he, amt);
    });

    const rows = PARENT_ORDER.map((key) => {
      const agg = byParent.get(key)!;
      const subs = Array.from(agg.subSpend.values())
        .filter((s) => s.amt > 0)
        .sort((a, b) => b.amt - a.amt);
      const top = subs.slice(0, 5);
      const subLabel =
        top.length === 0
          ? isHe
            ? "—"
            : "—"
          : top.map((s) => (isHe ? s.he : s.en)).join(", ");
      return {
        key,
        amount: agg.total,
        label: isHe ? CAT_LABELS[key].he : CAT_LABELS[key].en,
        subLabel,
      };
    })
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const maxAmt = rows.length ? Math.max(...rows.map((r) => r.amount)) : 1;
    return { rows, maxAmt };
  }, [fd.dailyTransactions, fd.autoExpenses, fd.homeFixed, inRangeIso, rangeDays, isHe]);

  const categoryIcon = (key: ParentCat) => {
    const cls = "w-4 h-4 text-slate-400 shrink-0";
    switch (key) {
      case "food":
        return <Utensils className={cls} strokeWidth={2} />;
      case "transport":
        return <Car className={cls} strokeWidth={2} />;
      case "rent":
        return <Home className={cls} strokeWidth={2} />;
      case "shopping":
        return <ShoppingBag className={cls} strokeWidth={2} />;
      default:
        return <LayoutGrid className={cls} strokeWidth={2} />;
    }
  };

  return (
    <div className={financeRoot}>
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {/* Segmented time filters (text-only) */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-0.5 rounded-lg border border-slate-200 bg-slate-50">
            {(
              [
                { key: "monthly", en: "Monthly", he: "חודשי" },
                { key: "yearly", en: "Yearly", he: "שנתי" },
                { key: "custom", en: "Custom", he: "מותאם" },
              ] as const
            ).map((opt) => {
              const active = rangeMode === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRangeMode(opt.key)}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    active ? "bg-white border border-slate-200 text-slate-900" : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {isHe ? opt.he : opt.en}
                </button>
              );
            })}
          </div>
        </div>

        {rangeMode === "custom" && (
          <div className="flex items-center justify-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px]"
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px]"
            />
          </div>
        )}

        {/* Big 4 — single row, sharp frame, privacy blur on amounts */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          <div className="relative flex flex-col justify-center min-h-[92px] sm:min-h-[104px] rounded-lg border border-slate-200 bg-white px-1.5 py-2.5 sm:px-2.5 sm:py-3 overflow-hidden min-w-0">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#008080]" aria-hidden />
            <div className="pl-2 flex flex-col items-center text-center min-w-0">
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">
                {isHe ? "הכנסות" : "Income"}
              </div>
              <div
                className={`text-sm sm:text-lg font-semibold tabular-nums tracking-tight leading-tight mt-0.5 text-[#008080] break-all ${amountBlur}`}
                style={{ fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
              >
                {incomeText.toFixed(0)}₪
              </div>
            </div>
          </div>

          <div className="relative flex flex-col justify-center min-h-[92px] sm:min-h-[104px] rounded-lg border border-slate-200 bg-white px-1.5 py-2.5 sm:px-2.5 sm:py-3 overflow-hidden min-w-0">
            <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: expensesAccent }} aria-hidden />
            <div className="pl-2 flex flex-col items-center text-center min-w-0">
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">
                {isHe ? "הוצאות" : "Expenses"}
              </div>
              <div
                className={`text-sm sm:text-lg font-semibold tabular-nums tracking-tight leading-tight mt-0.5 break-all ${amountBlur}`}
                style={{ color: expensesAccent, fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
              >
                {expensesText.toFixed(0)}₪
              </div>
            </div>
          </div>

          <div className="relative flex flex-col justify-center min-h-[92px] sm:min-h-[104px] rounded-lg border border-slate-200 bg-white px-1.5 py-2.5 sm:px-2.5 sm:py-3 overflow-hidden min-w-0">
            <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: netDisplayColor }} aria-hidden />
            <div className="pl-2 flex flex-col items-center text-center min-w-0 w-full">
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">
                {isHe ? "פער נטו" : "Net Gap"}
              </div>
              <div
                className={`text-sm sm:text-base font-semibold tabular-nums tracking-tight leading-tight mt-0.5 break-all ${amountBlur}`}
                style={{ color: netDisplayColor, fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
              >
                {netGap >= 0 ? "+" : ""}
                {netGap.toFixed(0)}₪
              </div>
              <div className={`mt-0.5 w-full flex justify-center ${amountBlur}`}>
                <SparklineMono data={netSeries7} color={netDisplayColor} w={64} h={16} />
              </div>
            </div>
          </div>

          <div className="relative flex flex-col justify-center min-h-[92px] sm:min-h-[104px] rounded-lg border border-slate-200 bg-white px-1.5 py-2.5 sm:px-2.5 sm:py-3 overflow-hidden min-w-0">
            <div
              className="absolute left-0 top-0 bottom-0 w-0.5"
              style={{ background: totalBalanceColor }}
              aria-hidden
            />
            <div className="pl-2 flex flex-col items-center text-center min-w-0">
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">
                {isHe ? "יתרה בחשבון" : "Total Balance"}
              </div>
              <div
                className={`text-sm sm:text-lg font-semibold tabular-nums tracking-tight leading-tight mt-0.5 break-all ${amountBlur}`}
                style={{ color: totalBalanceColor, fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
              >
                {totalBalance.toFixed(0)}₪
              </div>
            </div>
          </div>
        </div>

        {/* Expense categories — share of top spending buckets */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-[13px] font-semibold text-slate-800 mb-3">
            {isHe ? "קטגוריות הוצאות" : "Expense Categories"}
          </h3>
          {expenseCategoryBreakdown.rows.length === 0 ? (
            <p className="text-[13px] text-slate-500 py-2">
              {isHe ? "אין הוצאות בטווח שנבחר." : "No spending in the selected period."}
            </p>
          ) : (
            <ul className="space-y-4">
              {expenseCategoryBreakdown.rows.map((row) => {
                const pct = expenseCategoryBreakdown.maxAmt > 0 ? (row.amount / expenseCategoryBreakdown.maxAmt) * 100 : 0;
                return (
                  <li key={row.key} className="flex items-start gap-3">
                    {categoryIcon(row.key)}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-slate-800 leading-snug">{row.label}</p>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{row.subLabel}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1.5">
                          <span
                            className={`text-[13px] font-semibold tabular-nums tracking-tight text-slate-900 text-right ${amountBlur}`}
                            style={{ fontFeatureSettings: '"tnum" 1, "lnum" 1' }}
                          >
                            {row.amount.toFixed(0)}₪
                          </span>
                          <div className="h-1 w-[min(100%,140px)] rounded-sm bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-sm bg-slate-600 transition-all"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Single-line quick summary */}
        <div className="text-center text-[13px] text-slate-600 px-2">
          {privacyMode ? (
            <span className="inline-block blur-[3px] select-none">{summary}</span>
          ) : (
            <span>{summary}</span>
          )}
        </div>

        {/* Recent transactions (no icons) */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-800">{isHe ? "עסקאות אחרונות" : "Recent Transactions"}</p>
            <p className="text-[11px] text-slate-400">{isHe ? "5 אחרונות" : "Last 5"}</p>
          </div>
          <ul>
            {recentTxns.slice(0, 5).map((t) => (
              <li key={t.id} className="px-4 py-3 border-b border-slate-50 last:border-b-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{t.merchant}</p>
                  <p className="text-[11px] text-slate-400">{t.date}</p>
                </div>
                <div className={`text-[13px] font-semibold tabular-nums text-slate-900 ${privacyMode ? "blur-[3px] select-none" : ""}`}>
                  {t.amount.toFixed(0)}₪
                </div>
              </li>
            ))}
            {recentTxns.length === 0 && (
              <li className="px-4 py-5 text-center text-[13px] text-slate-500">
                {isHe ? "אין עסקאות לתצוגה" : "No transactions to show"}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

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
  const [showAdd, setShowAdd] = useState(false);

  const logExpense = () => {
    const a = parseFloat(logAmount);
    if (!logMerchant.trim() || Number.isNaN(a) || a <= 0) return;
    const today = dateStr(new Date());
    setFd((s) => ({
      ...s,
      dailyTransactions: [
        { id: newFinancialId(), channel: logChannel, amount: a, merchant: logMerchant.trim(), date: today },
        ...s.dailyTransactions,
      ],
    }));
    setLogAmount("");
    setLogMerchant("");
  };

  const last7ByChannel = useMemo(() => {
    const by: Record<SpendChannel, number> = { credit_card: 0, bank: 0, bit: 0, cash: 0 };
    fd.dailyTransactions.forEach((t) => {
      if (daysInRange(t.date, 7)) by[t.channel] += t.amount;
    });
    return by;
  }, [fd.dailyTransactions]);

  const total7 = Object.values(last7ByChannel).reduce((a, b) => a + b, 0) || 1;
  const series7 = useMemo(() => dailySpendSeries(fd.dailyTransactions, 7), [fd.dailyTransactions]);
  const weekCap = fd.settings.homeMonthlyCap * 0.28;
  const recent5 = useMemo(
    () => [...fd.dailyTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [fd.dailyTransactions]
  );

  const appsM = fd.subscriptions.reduce((s, x) => s + x.monthlyCost, 0);
  const memM = fd.memberships.reduce((s, x) => s + x.monthlyCost, 0);
  const homeM = fd.homeFixed.reduce((s, x) => s + x.monthlyAmount, 0);
  const autoM = fd.autoExpenses.filter((e) => daysInRange(e.date, 30)).reduce((s, x) => s + x.amount, 0);
  const invPL = fd.investments.reduce((s, x) => s + (x.value - x.costBasis), 0);
  const invV = fd.investments.reduce((s, x) => s + x.value, 0);

  const donutPcts = CHANNEL_META.map((c) => ({
    ...c,
    pct: (last7ByChannel[c.key] / total7) * 100,
  })).filter((x) => x.pct > 0.5);
  if (donutPcts.length === 0) donutPcts.push({ key: "credit_card", labelEn: "", labelHe: "", hex: "#e2e8f0", pct: 100 });

  let acc = 0;
  const gradient = donutPcts
    .map((s) => {
      const start = acc;
      acc += s.pct;
      return `${s.hex} ${start}% ${acc}%`;
    })
    .join(", ");

  return (
    <div className={financeRoot}>
      <div className="p-2 space-y-2 max-w-3xl mx-auto">
        {/* Header summary strip */}
        <div className="grid grid-cols-3 gap-1.5">
          <FxCard className="p-2">
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  {isHe ? "חובות" : "Due"}
                </p>
                <p className="text-base font-bold tabular-nums text-slate-900 mt-0.5">{totalDue.toFixed(0)}₪</p>
              </div>
              <Receipt className="w-4 h-4 text-teal-600 shrink-0 opacity-80" strokeWidth={2} />
            </div>
            <ProgressMicro value={Math.min(totalDue, 5000)} cap={5000} color={slateBlue} />
          </FxCard>
          <FxCard className="p-2">
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  {isHe ? "7 ימים" : "7d spend"}
                </p>
                <p className="text-base font-bold tabular-nums text-slate-900 mt-0.5">{total7.toFixed(0)}₪</p>
              </div>
              <Sparkline data={series7} w={56} h={18} />
            </div>
            <ProgressMicro value={total7} cap={weekCap || 1} />
          </FxCard>
          <FxCard className="p-2">
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  {isHe ? "תיק" : "Portfolio"}
                </p>
                <p className="text-base font-bold tabular-nums text-slate-900 mt-0.5">
                  {(invV / 1000).toFixed(0)}k₪
                </p>
                <p className={`text-[10px] font-semibold tabular-nums ${invPL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {invPL >= 0 ? "+" : ""}
                  {invPL.toFixed(0)} P/L
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-teal-600 shrink-0" strokeWidth={2} />
            </div>
          </FxCard>
        </div>

        {/* Cockpit: donut + spark + legend */}
        <FxCard className="p-2 flex flex-wrap items-center gap-3">
          <div
            className="relative w-[52px] h-[52px] rounded-full shrink-0"
            style={{
              background: `conic-gradient(${gradient})`,
            }}
          >
            <div className="absolute inset-[10px] rounded-full bg-white flex items-center justify-center shadow-inner">
              <span className="text-[9px] font-bold text-slate-600">{isHe ? "ערוצים" : "Mix"}</span>
            </div>
          </div>
          <div className="flex-1 min-w-[140px] space-y-1">
            {CHANNEL_META.map(({ key, labelEn, labelHe, hex }) => {
              const v = last7ByChannel[key];
              const pct = Math.round((v / total7) * 100);
              return (
                <div key={key} className="flex items-center gap-2 text-[11px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
                  <span className="text-slate-600 truncate flex-1">{isHe ? labelHe : labelEn}</span>
                  <span className="tabular-nums font-semibold text-slate-800">{v.toFixed(0)}₪</span>
                  <span className="text-slate-400 w-7 text-end">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="w-full sm:w-auto sm:min-w-[100px] border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-3">
            <p className="text-[9px] uppercase font-semibold text-slate-500 mb-1">{isHe ? "מגמה" : "Trend"}</p>
            <Sparkline data={series7} w={88} h={28} />
          </div>
        </FxCard>

        {/* Cross-category micro widgets */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {[
            { icon: <LayoutGrid className="w-3 h-3" />, l: isHe ? "אפליקציות" : "Apps", v: `${appsM.toFixed(0)}₪`, sub: "/mo" },
            { icon: <Dumbbell className="w-3 h-3" />, l: isHe ? "מנויים" : "Gym+", v: `${memM.toFixed(0)}₪`, sub: "/mo" },
            { icon: <Home className="w-3 h-3" />, l: isHe ? "בית" : "Home", v: `${homeM.toFixed(0)}₪`, sub: "/mo" },
            { icon: <Car className="w-3 h-3" />, l: isHe ? "רכב" : "Auto", v: `${autoM.toFixed(0)}₪`, sub: "30d" },
            {
              icon: invPL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />,
              l: isHe ? "השקעות" : "Inv.",
              v: `${(invV / 1000).toFixed(0)}k`,
              sub: "₪",
            },
          ].map((x, i) => (
            <FxCard key={i} className="p-1.5 flex items-center gap-1.5">
              <span className="text-teal-600">{x.icon}</span>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-500 truncate">{x.l}</p>
                <p className="text-[11px] font-bold tabular-nums leading-tight">
                  {x.v}
                  <span className="text-[9px] font-normal text-slate-400">{x.sub}</span>
                </p>
              </div>
            </FxCard>
          ))}
        </div>

        {/* Last 5 txns */}
        <FxCard className="overflow-hidden">
          <div className="px-2 py-1.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="text-[10px] font-semibold uppercase text-slate-500">{isHe ? "אחרונות" : "Latest"}</span>
            <button
              type="button"
              onClick={() => setShowAdd(!showAdd)}
              className="text-[10px] font-medium text-teal-600 flex items-center gap-0.5"
            >
              + {isHe ? "הוצאה" : "Log"}
              {showAdd ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          {showAdd && (
            <div className="p-2 flex flex-wrap gap-1 border-b border-slate-100 bg-white">
              <select
                value={logChannel}
                onChange={(e) => setLogChannel(e.target.value as SpendChannel)}
                className="text-[11px] border border-slate-200 rounded-lg px-1.5 py-1"
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
                placeholder="…"
                className="flex-1 min-w-[80px] text-[11px] border border-slate-200 rounded-lg px-2 py-1"
              />
              <input
                type="number"
                value={logAmount}
                onChange={(e) => setLogAmount(e.target.value)}
                className="w-16 text-[11px] border border-slate-200 rounded-lg px-1 py-1 tabular-nums"
              />
              <button
                type="button"
                onClick={logExpense}
                className="text-[11px] px-2 py-1 rounded-lg bg-teal-600 text-white font-medium"
              >
                OK
              </button>
            </div>
          )}
          <ul>
            {recent5.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between px-2 py-1.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-teal-600 shrink-0">
                    <ChannelIcon ch={t.channel} />
                  </span>
                  <span className="truncate text-[11px] font-medium text-slate-800">{t.merchant}</span>
                </div>
                <div className="text-end shrink-0">
                  <span className="text-[11px] font-semibold tabular-nums">−{t.amount.toFixed(0)}₪</span>
                  <span className="text-[9px] text-slate-400 block">{t.date.slice(5)}</span>
                </div>
              </li>
            ))}
          </ul>
        </FxCard>

        <p className="text-[9px] text-center text-slate-400 px-2">{isHe ? "נשמר במכשיר" : "On-device"}</p>
      </div>
    </div>
  );
}

function HeaderSummary3({
  isHe,
  items,
}: {
  isHe: boolean;
  items: { label: string; value: string; sub?: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 mb-2">
      {items.map((it, i) => (
        <FxCard key={i} className="p-2 flex items-center gap-2">
          {it.icon && <span className="text-teal-600 shrink-0">{it.icon}</span>}
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 truncate">{it.label}</p>
            <p className="text-[13px] font-bold tabular-nums text-slate-900 leading-tight">{it.value}</p>
            {it.sub && <p className="text-[9px] text-slate-500 truncate">{it.sub}</p>}
          </div>
        </FxCard>
      ))}
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
  const totalM = fd.subscriptions.reduce((s, x) => s + x.monthlyCost, 0);
  const totalYtd = fd.subscriptions.reduce((s, x) => s + x.ytdPaid, 0);
  const cap = fd.settings.appsMonthlyCap;
  const spark = useMemo(() => {
    const base = totalM / 30;
    return Array.from({ length: 7 }, (_, i) => base * (0.85 + (i % 3) * 0.1));
  }, [totalM]);

  const [newName, setNewName] = useState("");
  const [newMo, setNewMo] = useState("");
  const [newYtd, setNewYtd] = useState("");
  const [expand, setExpand] = useState(false);

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
    <div className={financeRoot}>
      <div className="p-2 max-w-3xl mx-auto">
        <HeaderSummary3
          isHe={isHe}
          items={[
            {
              label: isHe ? "סה״כ חודשי" : "Monthly total",
              value: `${totalM.toFixed(0)}₪`,
              sub: isHe ? "מנויים" : "subs",
              icon: <LayoutGrid className="w-4 h-4" strokeWidth={2} />,
            },
            {
              label: isHe ? "מול תקציב" : "vs budget",
              value: `${Math.min(100, Math.round((totalM / cap) * 100))}%`,
              sub: `${totalM.toFixed(0)} / ${cap}₪`,
              icon: <Sparkline data={spark} w={48} h={16} />,
            },
            {
              label: isHe ? "שולם YTD" : "Paid YTD",
              value: `${totalYtd.toFixed(0)}₪`,
              icon: <LineChart className="w-4 h-4" strokeWidth={2} />,
            },
          ]}
        />
        <ProgressMicro value={totalM} cap={cap} />
        <p className="text-[9px] text-slate-500 mt-0.5 mb-2">{isHe ? "תקציב מנויים חודשי" : "Monthly apps budget"}</p>

        <FxCard className="overflow-hidden mb-2">
          <div className="grid grid-cols-[1fr_4rem_4rem_4.5rem] gap-1 px-2 py-1.5 bg-slate-50/80 text-[9px] font-semibold uppercase text-slate-500 border-b border-slate-100">
            <span>{isHe ? "שירות" : "Service"}</span>
            <span className="text-end">{isHe ? "חודש" : "Mo"}</span>
            <span className="text-end">YTD</span>
            <span className="text-end" />
          </div>
          {fd.subscriptions
            .slice()
            .sort((a, b) => {
              // Approximate "next billing" from today (monthly cycle) — keeps UI priority without adding new data fields.
              const today = new Date().getTime();
              const nextA = new Date(today + 30 * 86400000).getTime();
              const nextB = new Date(today + 30 * 86400000).getTime();
              return nextA - nextB;
            })
            .map((s) => {
              const nextDate = new Date();
              nextDate.setDate(nextDate.getDate() + 30);
              const nextStr = nextDate.toISOString().slice(5, 10);
              return (
            <div
              key={s.id}
              className="grid grid-cols-[1fr_4rem_4rem_4.5rem] gap-1 px-2 py-1.5 border-b border-slate-50 items-center hover:bg-slate-50/50"
              title={isHe ? "תאריך חיוב משוער (לפי 30 יום)" : "Estimated billing date (30d)"}
            >
              <div className="flex items-center gap-2 min-w-0">
                <SubBrandIcon name={s.name} />
                <span className="text-[11px] font-medium truncate text-slate-800">{s.name}</span>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-end text-teal-700">{s.monthlyCost.toFixed(0)}</span>
              <span className="text-[11px] tabular-nums text-end text-slate-600">{s.ytdPaid.toFixed(0)}</span>
              <span className="text-[10px] tabular-nums text-end text-slate-400">{nextStr}</span>
              <button
                type="button"
                onClick={() => setFd((st) => ({ ...st, subscriptions: st.subscriptions.filter((x) => x.id !== s.id) }))}
                className="text-[9px] font-medium text-slate-500 border border-transparent rounded-md py-0.5 hover:text-red-600 hover:bg-red-50 transition-colors hover:border-red-200"
              >
                {isHe ? "בטל" : "Cancel"}
              </button>
            </div>
              );
            })}
        </FxCard>

        <button
          type="button"
          onClick={() => setExpand(!expand)}
          className="w-full text-[10px] font-medium text-teal-600 py-1 flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> {isHe ? "הוסף מנוי" : "Add subscription"}
        </button>
        {expand && (
          <FxCard className="p-2 flex flex-wrap gap-1 mt-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={isHe ? "שם" : "Name"}
              className="flex-1 min-w-[100px] text-[11px] border border-slate-200 rounded-lg px-2 py-1"
            />
            <input
              type="number"
              value={newMo}
              onChange={(e) => setNewMo(e.target.value)}
              className="w-20 text-[11px] border rounded-lg px-1 py-1 tabular-nums"
              placeholder="mo"
            />
            <input
              type="number"
              value={newYtd}
              onChange={(e) => setNewYtd(e.target.value)}
              className="w-20 text-[11px] border rounded-lg px-1 py-1 tabular-nums"
              placeholder="ytd"
            />
            <button type="button" onClick={addSub} className="px-3 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-medium">
              {isHe ? "שמור" : "Save"}
            </button>
          </FxCard>
        )}
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
  const totalM = fd.memberships.reduce((s, x) => s + x.monthlyCost, 0);
  const cap = fd.settings.membershipsMonthlyCap;
  const spark = useMemo(() => dailySpendSeries(fd.dailyTransactions.map((t) => ({ ...t })), 7), [fd.dailyTransactions]);

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
    <div className={financeRoot}>
      <div className="p-2 max-w-3xl mx-auto">
        <HeaderSummary3
          isHe={isHe}
          items={[
            {
              label: isHe ? "סה״כ חודשי" : "Monthly",
              value: `${totalM.toFixed(0)}₪`,
              icon: <Dumbbell className="w-4 h-4" strokeWidth={2} />,
            },
            {
              label: isHe ? "פריטים" : "Items",
              value: String(fd.memberships.length),
              sub: isHe ? "מנויים" : "active",
            },
            {
              label: isHe ? "מגמת הוצאה" : "Trend",
              value: "7d",
              icon: <Sparkline data={spark} w={56} h={20} />,
            },
          ]}
        />
        <ProgressMicro value={totalM} cap={cap} color={slateBlue} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
          {fd.memberships.map((m) => (
            <FxCard key={m.id} className="p-2 relative">
              <button
                type="button"
                onClick={() => setFd((s) => ({ ...s, memberships: s.memberships.filter((x) => x.id !== m.id) }))}
                className="absolute top-1 end-1 text-[10px] text-slate-400 hover:text-red-600"
              >
                ×
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="min-w-0 pe-4">
                  <p className="text-[11px] font-semibold truncate text-slate-800">{m.name}</p>
                  <p className="text-[13px] font-bold text-teal-700 tabular-nums">{m.monthlyCost.toFixed(0)}₪/mo</p>
                  {m.note && <p className="text-[9px] text-slate-500 truncate">{m.note}</p>}
                </div>
              </div>
            </FxCard>
          ))}
        </div>

        <FxCard className="p-2 flex flex-wrap gap-1 mt-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isHe ? "שם" : "Name"}
            className="flex-1 min-w-[100px] text-[11px] border border-slate-200 rounded-lg px-2 py-1"
          />
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-24 text-[11px] border rounded-lg px-2 py-1 tabular-nums"
            placeholder="₪/mo"
          />
          <button type="button" onClick={add} className="px-3 py-1 rounded-lg bg-teal-600 text-white text-[11px] font-medium">
            +
          </button>
        </FxCard>
      </div>
    </div>
  );
}

const HOME_ICONS: Record<HomeFixedType, React.ReactNode> = {
  electricity: <Zap className="w-3.5 h-3.5" strokeWidth={2} />,
  water: <Droplets className="w-3.5 h-3.5" strokeWidth={2} />,
  rent: <Home className="w-3.5 h-3.5" strokeWidth={2} />,
  arnona: <Building2 className="w-3.5 h-3.5" strokeWidth={2} />,
};

export function HomeFixedTab({
  isHe,
  fd,
  setFd,
  bills = [],
}: {
  isHe: boolean;
  fd: FinancialDashboardState;
  setFd: React.Dispatch<React.SetStateAction<FinancialDashboardState>>;
  bills?: BillEntry[];
}) {
  const labels: Record<HomeFixedType, { en: string; he: string }> = {
    electricity: { en: "Electricity", he: "חשמל" },
    water: { en: "Water", he: "מים" },
    rent: { en: "Rent", he: "שכירות" },
    arnona: { en: "Arnona", he: "ארנונה" },
  };
  const totalM = fd.homeFixed.reduce((s, x) => s + x.monthlyAmount, 0);
  const dueWeek = billsDueWithinDays(bills, 7);
  const cap = fd.settings.homeMonthlyCap;
  const spark = useMemo(() => {
    return fd.homeFixed.map((h) => h.monthlyAmount / 30);
  }, [fd.homeFixed]);
  const spark7 = Array.from({ length: 7 }, (_, i) => (spark.reduce((a, b) => a + b, 0) / 4) * (0.9 + (i % 4) * 0.05));

  return (
    <div className={financeRoot}>
      <div className="p-2 max-w-3xl mx-auto">
        <HeaderSummary3
          isHe={isHe}
          items={[
            {
              label: isHe ? "קבוע חודשי" : "Fixed / mo",
              value: `${totalM.toFixed(0)}₪`,
              icon: <Home className="w-4 h-4" strokeWidth={2} />,
            },
            {
              label: isHe ? "לתשלום השבוע" : "Due this week",
              value: String(dueWeek),
              sub: isHe ? "חשבונות" : "bills",
              icon: <Receipt className="w-4 h-4 text-slate-600" strokeWidth={2} />,
            },
            {
              label: isHe ? "עומס" : "Load",
              value: `${Math.min(100, Math.round((totalM / cap) * 100))}%`,
              icon: <Sparkline data={spark7} w={52} h={18} />,
            },
          ]}
        />
        <ProgressMicro value={totalM} cap={cap} />

        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {fd.homeFixed.map((h) => (
            <FxCard key={h.id} className="p-2 flex gap-2 items-center">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0">
                {HOME_ICONS[h.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-semibold uppercase text-slate-500">{isHe ? labels[h.type].he : labels[h.type].en}</p>
                <p className="text-[10px] font-medium text-slate-700 truncate">{h.label}</p>
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
                  className="w-full text-[13px] font-bold tabular-nums text-teal-800 border border-slate-200 rounded-md px-1.5 py-0.5 mt-0.5"
                />
              </div>
            </FxCard>
          ))}
        </div>
      </div>
    </div>
  );
}

const AUTO_META: Record<AutoExpenseType, { Icon: typeof Fuel; labelEn: string; labelHe: string }> = {
  fuel: { Icon: Fuel, labelEn: "Fuel", labelHe: "דלק" },
  repair: { Icon: Wrench, labelEn: "Repair", labelHe: "תיקון" },
  insurance: { Icon: Shield, labelEn: "Insurance", labelHe: "ביטוח" },
  tolls: { Icon: Milestone, labelEn: "Tolls", labelHe: "אגרה" },
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
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthKey = dateStr(monthStart);
  const thisMonthSpend = fd.autoExpenses
    .filter((e) => e.date >= monthKey)
    .reduce((s, x) => s + x.amount, 0);

  const fuelList = fd.autoExpenses.filter((e) => e.type === "fuel").sort((a, b) => b.date.localeCompare(a.date));
  const lastFuel = fuelList[0];
  const insList = fd.autoExpenses.filter((e) => e.type === "insurance").sort((a, b) => b.date.localeCompare(a.date));
  const lastIns = insList[0];
  const nextInsHint = lastIns
    ? (() => {
        const d = new Date(lastIns.date);
        d.setMonth(d.getMonth() + 1);
        return dateStr(d);
      })()
    : "—";

  const cap = fd.settings.autoMonthlyCap;
  const spark = useMemo(() => {
    const autoTx = fd.autoExpenses.map((e) => ({ date: e.date, amount: e.amount }));
    return dailySpendSeries(autoTx, 7);
  }, [fd.autoExpenses]);

  const [atype, setAtype] = useState<AutoExpenseType>("fuel");
  const [alabel, setAlabel] = useState("");
  const [aamt, setAamt] = useState("");
  const [adate, setAdate] = useState(() => dateStr(new Date()));
  const [expand, setExpand] = useState(false);

  const byType = useMemo(() => {
    const m: Record<AutoExpenseType, typeof fd.autoExpenses> = { fuel: [], repair: [], insurance: [], tolls: [] };
    fd.autoExpenses.forEach((e) => m[e.type].push(e));
    return m;
  }, [fd.autoExpenses]);

  const addAuto = () => {
    const amt = parseFloat(aamt);
    if (!alabel.trim() || Number.isNaN(amt) || amt <= 0) return;
    setFd((s) => ({
      ...s,
      autoExpenses: [...s.autoExpenses, { id: newFinancialId(), type: atype, label: alabel.trim(), amount: amt, date: adate }],
    }));
    setAlabel("");
    setAamt("");
  };

  return (
    <div className={financeRoot}>
      <div className="p-2 max-w-3xl mx-auto">
        <HeaderSummary3
          isHe={isHe}
          items={[
            {
              label: isHe ? "חודש נוכחי" : "Month spend",
              value: `${thisMonthSpend.toFixed(0)}₪`,
              icon: <Car className="w-4 h-4" strokeWidth={2} />,
            },
            {
              label: isHe ? "תדלוק אחרון" : "Last refuel",
              value: lastFuel ? `${lastFuel.amount.toFixed(0)}₪` : "—",
              sub: lastFuel?.date ?? "",
            },
            {
              label: isHe ? "ביטוח הבא" : "Next ins.",
              value: nextInsHint !== "—" ? nextInsHint.slice(5) : "—",
              sub: isHe ? "הערכה" : "est.",
            },
          ]}
        />
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1">
            <ProgressMicro value={thisMonthSpend} cap={cap} color="#334155" />
          </div>
          <Sparkline data={spark} w={64} h={20} />
        </div>
        <p className="text-[9px] text-slate-500 mb-2">{isHe ? "מול תקרת רכב חודשית" : "vs monthly auto cap"}</p>

        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(AUTO_META) as AutoExpenseType[]).map((type) => {
            const { Icon, labelEn, labelHe } = AUTO_META[type];
            const list = [...byType[type]].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
            const sub = list.reduce((s, x) => s + x.amount, 0);
            return (
              <FxCard key={type} className="p-2">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                    <Icon className="w-3.5 h-3.5 text-teal-600" strokeWidth={2} />
                    {isHe ? labelHe : labelEn}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-slate-800">{sub.toFixed(0)}₪</span>
                </div>
                <ul className="space-y-0.5">
                  {list.length === 0 ? (
                    <li className="text-[9px] text-slate-400">—</li>
                  ) : (
                    list.map((e) => (
                      <li key={e.id} className="flex justify-between text-[10px] text-slate-600">
                        <span className="truncate flex-1 me-1">{e.label}</span>
                        <button
                          type="button"
                          onClick={() => setFd((s) => ({ ...s, autoExpenses: s.autoExpenses.filter((x) => x.id !== e.id) }))}
                          className="text-slate-400 hover:text-red-600 shrink-0"
                        >
                          ×
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </FxCard>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setExpand(!expand)}
          className="w-full mt-2 text-[10px] font-medium text-teal-600 py-1"
        >
          + {isHe ? "הוצאה" : "Add expense"}
        </button>
        {expand && (
          <FxCard className="p-2 flex flex-wrap gap-1">
            <select
              value={atype}
              onChange={(e) => setAtype(e.target.value as AutoExpenseType)}
              className="text-[11px] border rounded-lg px-1 py-1"
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
              className="flex-1 min-w-[80px] text-[11px] border rounded-lg px-2 py-1"
            />
            <input
              type="number"
              value={aamt}
              onChange={(e) => setAamt(e.target.value)}
              className="w-20 text-[11px] border rounded-lg px-1 py-1"
            />
            <input type="date" value={adate} onChange={(e) => setAdate(e.target.value)} className="text-[11px] border rounded-lg px-1 py-1" />
            <button type="button" onClick={addAuto} className="px-2 py-1 bg-teal-600 text-white rounded-lg text-[11px]">
              OK
            </button>
          </FxCard>
        )}
      </div>
    </div>
  );
}

const INV_ICON: Record<InvestmentKind, React.ReactNode> = {
  stock: <LineChart className="w-3.5 h-3.5" strokeWidth={2} />,
  crypto: <Bitcoin className="w-3.5 h-3.5" strokeWidth={2} />,
  savings: <PiggyBank className="w-3.5 h-3.5" strokeWidth={2} />,
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
  const totalV = fd.investments.reduce((s, x) => s + x.value, 0);
  const sparkLine = useMemo(
    () => Array.from({ length: 7 }, (_, i) => (totalV / 7000) * (0.95 + (i % 5) * 0.02)),
    [totalV]
  );

  return (
    <div className={financeRoot}>
      <div className="p-2 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <FxCard className="p-2 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase text-slate-500">{isHe ? "שווי" : "Value"}</p>
              <p className="text-[15px] font-bold tabular-nums">{totalV.toLocaleString()}₪</p>
            </div>
            <Sparkline data={sparkLine} w={72} h={24} />
          </FxCard>
          <FxCard className="p-2">
            <p className="text-[9px] font-semibold uppercase text-slate-500">{isHe ? "P/L כולל" : "Total P/L"}</p>
            <p className={`text-[15px] font-bold tabular-nums ${totalPL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {totalPL >= 0 ? "+" : ""}
              {totalPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}₪
            </p>
          </FxCard>
        </div>

        <FxCard className="overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_3.2rem_3.2rem_3.5rem] gap-0.5 px-1.5 py-1 bg-slate-50 text-[8px] font-bold uppercase text-slate-500 border-b">
            <span>{isHe ? "נכס" : "Asset"}</span>
            <span className="text-end">Val</span>
            <span className="text-end">Cost</span>
            <span className="text-end">P/L</span>
          </div>
          {fd.investments.map((inv) => {
            const pl = inv.value - inv.costBasis;
            const pct = inv.costBasis ? (pl / inv.costBasis) * 100 : 0;
            const pos = pl >= 0;
            return (
              <div
                key={inv.id}
                className="grid grid-cols-[minmax(0,1fr)_3.2rem_3.2rem_3.5rem] gap-0.5 px-1.5 py-0.5 border-b border-slate-50 items-center hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${pos ? "bg-emerald-500" : "bg-red-500"}`}
                    aria-hidden
                  />
                  <span className="w-6 h-6 rounded-md bg-slate-800 text-white flex items-center justify-center shrink-0">
                    {INV_ICON[inv.kind]}
                  </span>
                  <span className="text-[10px] font-semibold truncate text-slate-800">{inv.name}</span>
                </div>
                <input
                  type="number"
                  defaultValue={inv.value}
                  key={inv.id + "v" + inv.value}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isNaN(v) || v < 0) return;
                    setFd((s) => ({
                      ...s,
                      investments: s.investments.map((x) => (x.id === inv.id ? { ...x, value: v } : x)),
                    }));
                  }}
                  className="text-[10px] tabular-nums text-end border border-transparent hover:border-slate-200 rounded px-0.5 w-full"
                />
                <input
                  type="number"
                  defaultValue={inv.costBasis}
                  key={inv.id + "c" + inv.costBasis}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isNaN(v) || v < 0) return;
                    setFd((s) => ({
                      ...s,
                      investments: s.investments.map((x) => (x.id === inv.id ? { ...x, costBasis: v } : x)),
                    }));
                  }}
                  className="text-[10px] tabular-nums text-end border border-transparent hover:border-slate-200 rounded px-0.5 w-full text-slate-600"
                />
                <div className={`text-[10px] font-bold tabular-nums text-end leading-tight ${pos ? "text-emerald-600" : "text-red-600"}`}>
                  {pos ? "+" : ""}
                  {pl.toFixed(0)}
                  <span className="block text-[8px] font-normal opacity-80">
                    {pos ? "+" : ""}
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </FxCard>
      </div>
    </div>
  );
}
