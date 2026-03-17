/**
 * Financial dashboard data — persisted in localStorage (mock-friendly).
 */

export type SpendChannel = "credit_card" | "bank" | "bit" | "cash";

export interface DailyTransaction {
  id: string;
  channel: SpendChannel;
  amount: number;
  merchant: string;
  date: string; // YYYY-MM-DD
}

export interface SubscriptionRow {
  id: string;
  name: string;
  monthlyCost: number;
  ytdPaid: number;
}

export interface MembershipRow {
  id: string;
  name: string;
  monthlyCost: number;
  note?: string;
}

export type HomeFixedType = "electricity" | "water" | "rent" | "arnona";

export interface HomeFixedRow {
  id: string;
  type: HomeFixedType;
  label: string;
  monthlyAmount: number;
}

export type AutoExpenseType = "fuel" | "repair" | "insurance" | "tolls";

export interface AutoExpenseRow {
  id: string;
  type: AutoExpenseType;
  label: string;
  amount: number;
  date: string;
}

export type InvestmentKind = "stock" | "crypto" | "savings";

export interface InvestmentRow {
  id: string;
  name: string;
  kind: InvestmentKind;
  value: number;
  costBasis: number;
}

/** Caps for progress bars (ILS). */
export interface FinancialDashboardSettings {
  autoMonthlyCap: number;
  appsMonthlyCap: number;
  membershipsMonthlyCap: number;
  homeMonthlyCap: number;
}

export interface FinancialDashboardState {
  dailyTransactions: DailyTransaction[];
  subscriptions: SubscriptionRow[];
  memberships: MembershipRow[];
  homeFixed: HomeFixedRow[];
  autoExpenses: AutoExpenseRow[];
  investments: InvestmentRow[];
  settings: FinancialDashboardSettings;
}

const STORAGE_KEY = "ollin_financial_dashboard_v1";

function id() {
  return `fd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const DEFAULT_FINANCIAL_DASHBOARD: FinancialDashboardState = {
  dailyTransactions: [
    { id: id(), channel: "credit_card", amount: 127.5, merchant: "Supermarket", date: today() },
    { id: id(), channel: "bit", amount: 45, merchant: "Coffee", date: today() },
    { id: id(), channel: "credit_card", amount: 289, merchant: "Electronics", date: daysAgo(1) },
    { id: id(), channel: "bank", amount: 1200, merchant: "Rent transfer", date: daysAgo(1) },
    { id: id(), channel: "credit_card", amount: 64.9, merchant: "Fuel", date: daysAgo(2) },
    { id: id(), channel: "cash", amount: 80, merchant: "Market", date: daysAgo(2) },
    { id: id(), channel: "bit", amount: 199, merchant: "Online order", date: daysAgo(3) },
    { id: id(), channel: "credit_card", amount: 42, merchant: "Parking", date: daysAgo(4) },
  ],
  subscriptions: [
    { id: id(), name: "Netflix", monthlyCost: 49.9, ytdPaid: 149.7 },
    { id: id(), name: "Adobe Creative Cloud", monthlyCost: 198, ytdPaid: 594 },
    { id: id(), name: "iCloud+", monthlyCost: 11.9, ytdPaid: 35.7 },
    { id: id(), name: "Spotify", monthlyCost: 34.9, ytdPaid: 104.7 },
  ],
  memberships: [
    { id: id(), name: "City Gym", monthlyCost: 249, note: "Annual deal" },
    { id: id(), name: "Municipal pool", monthlyCost: 89 },
    { id: id(), name: "Express Car Wash", monthlyCost: 120, note: "Unlimited" },
  ],
  homeFixed: [
    { id: id(), type: "electricity", label: "IEC", monthlyAmount: 420 },
    { id: id(), type: "water", label: "Mekorot", monthlyAmount: 95 },
    { id: id(), type: "rent", label: "Rent", monthlyAmount: 6500 },
    { id: id(), type: "arnona", label: "Arnona", monthlyAmount: 380 },
  ],
  autoExpenses: [
    { id: id(), type: "fuel", label: "Fuel — station", amount: 320, date: daysAgo(2) },
    { id: id(), type: "insurance", label: "Annual insurance (1/12)", amount: 180, date: daysAgo(5) },
    { id: id(), type: "tolls", label: "Highway 6", amount: 47, date: daysAgo(1) },
    { id: id(), type: "repair", label: "Oil change", amount: 350, date: daysAgo(14) },
  ],
  investments: [
    { id: id(), name: "TA-35 ETF", kind: "stock", value: 42000, costBasis: 38000 },
    { id: id(), name: "BTC", kind: "crypto", value: 12500, costBasis: 14200 },
    { id: id(), name: "Emergency fund", kind: "savings", value: 85000, costBasis: 85000 },
  ],
  settings: {
    autoMonthlyCap: 4200,
    appsMonthlyCap: 650,
    membershipsMonthlyCap: 600,
    homeMonthlyCap: 8200,
  },
};

const DEFAULT_SETTINGS: FinancialDashboardSettings = DEFAULT_FINANCIAL_DASHBOARD.settings;

export function loadFinancialDashboard(): FinancialDashboardState {
  if (typeof window === "undefined") return DEFAULT_FINANCIAL_DASHBOARD;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FINANCIAL_DASHBOARD;
    const p = JSON.parse(raw) as Partial<FinancialDashboardState>;
    const settings: FinancialDashboardSettings = {
      ...DEFAULT_SETTINGS,
      ...(p.settings && typeof p.settings === "object" ? p.settings : {}),
    };
    return {
      dailyTransactions: Array.isArray(p.dailyTransactions) ? p.dailyTransactions : DEFAULT_FINANCIAL_DASHBOARD.dailyTransactions,
      subscriptions: Array.isArray(p.subscriptions) ? p.subscriptions : DEFAULT_FINANCIAL_DASHBOARD.subscriptions,
      memberships: Array.isArray(p.memberships) ? p.memberships : DEFAULT_FINANCIAL_DASHBOARD.memberships,
      homeFixed: Array.isArray(p.homeFixed) ? p.homeFixed : DEFAULT_FINANCIAL_DASHBOARD.homeFixed,
      autoExpenses: Array.isArray(p.autoExpenses) ? p.autoExpenses : DEFAULT_FINANCIAL_DASHBOARD.autoExpenses,
      investments: Array.isArray(p.investments) ? p.investments : DEFAULT_FINANCIAL_DASHBOARD.investments,
      settings,
    };
  } catch {
    return DEFAULT_FINANCIAL_DASHBOARD;
  }
}

export function saveFinancialDashboard(state: FinancialDashboardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export { id as newFinancialId };
