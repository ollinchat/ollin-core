export type DocStatus = "Pending" | "Processed";

export type ExpenseCategory = "Fuel" | "Food" | "Office" | "Travel" | "Other";

export interface ScannedDoc {
  id: string;
  fileName: string;
  date: string;
  amount: string;
  supplier: string;
  vat: string;
  status: DocStatus;
  scannedAt: number;
  category?: ExpenseCategory;
}

/** Document lifecycle: active or canceled (no delete for tax compliance). */
export type FinanceDocStatus = "active" | "canceled";

export interface Quote {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  amount: string;
  description: string;
  date: string;
  status: FinanceDocStatus;
  createdAt: number;
}

export interface TaxInvoice {
  id: string;
  number: string;
  quoteId?: string;
  clientId: string;
  clientName: string;
  amount: string;
  description: string;
  date: string;
  status: FinanceDocStatus;
  createdAt: number;
}

export interface Receipt {
  id: string;
  number: string;
  invoiceId?: string;
  clientId: string;
  clientName: string;
  amount: string;
  description: string;
  date: string;
  status: FinanceDocStatus;
  createdAt: number;
}

export interface CompanyProfile {
  name: string;
  vatId: string;
  address: string;
  logo?: string;
  signature?: string;
}

export type ClientType = "company" | "private";

export interface FinanceClient {
  id: string;
  name: string;
  email: string;
  /** Company vs Private Client for clear UI separation (Invoice4U/Morning style). */
  clientType?: ClientType;
  vatId?: string;
  address?: string;
  createdAt: number;
}

/** Israeli tax invoice: auto-numbering, "Tax Invoice" / "חשבונית מס" header */
export const TAX_INVOICE_HEADER_EN = "Tax Invoice";
export const TAX_INVOICE_HEADER_HE = "חשבונית מס";
