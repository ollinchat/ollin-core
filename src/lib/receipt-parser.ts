/**
 * Parse receipt/invoice text (OCR output) for Total Amount, Date, Supplier, and Category.
 */

import type { ExpenseCategory } from "./finance-types";

export interface ParsedReceipt {
  amount: string;
  date: string;
  supplier: string;
  vat: string;
  category: ExpenseCategory;
}

const AMOUNT_PATTERNS = [
  /(?:total|amount due|balance|sum|grand total)\s*[:\s]*[\$€£]?\s*([\d,]+\.?\d*)/i,
  /(?:total|amount)\s*[:\s]*([\d,]+\.?\d*)\s*(?:[\$€£]|USD|EUR|ILS)/i,
  /[\$€£]\s*([\d,]+\.?\d*)\s*$/im,
  /([\d,]+\.\d{2})\s*$/m,
];

const DATE_PATTERNS = [
  /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/,
  /\b(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/,
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i,
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i,
];

const VAT_PATTERNS = [
  /(?:vat|gst|tax)\s*[:\s]*(\d+(?:\.\d+)?\s*%?)/i,
  /(\d+(?:\.\d+)?\s*%)\s*(?:vat|gst|tax)/i,
];

/** Normalize amount string (e.g. "1,250.00" -> "1,250.00") */
function normalizeAmount(s: string): string {
  const cleaned = s.replace(/\s/g, "").replace(/[^\d.,]/g, "");
  const num = parseFloat(cleaned.replace(/,/g, ""));
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Try to format date as YYYY-MM-DD for consistency */
function normalizeDate(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "—";
  // Already ISO-like
  const iso = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  // DD/MM/YYYY or MM/DD/YYYY
  const dmy = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/.exec(trimmed);
  if (dmy) {
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${y}-${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}`;
  }
  return trimmed;
}

/** Supplier: often first non-empty line or line after "From"/"Vendor"/"Supplier" */
function findSupplier(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fromMatch = text.match(/(?:from|vendor|supplier|merchant|store)\s*[:\s]*([^\n]+)/i);
  if (fromMatch?.[1]) return fromMatch[1].trim().slice(0, 80);
  if (lines.length > 0) return lines[0].slice(0, 80);
  return "—";
}

const CATEGORY_KEYWORDS: { category: ExpenseCategory; patterns: RegExp[] }[] = [
  { category: "Fuel", patterns: [/fuel|petrol|gas station|benzina|תדלוק|דלק/i] },
  { category: "Food", patterns: [/restaurant|cafe|coffee|food|מסעדה|קפה|אוכל/i] },
  { category: "Office", patterns: [/office|supplies|stationery|משרד|מחסנית|ציוד/i] },
  { category: "Travel", patterns: [/hotel|flight|travel|מלון|טיסה|נסיעה/i] },
];

function detectCategory(text: string): ExpenseCategory {
  const lower = text.toLowerCase();
  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((p) => p.test(lower))) return category;
  }
  return "Other";
}

export function parseReceiptText(ocrText: string): ParsedReceipt {
  const text = ocrText || "";
  let amount = "—";
  let date = "—";
  let vat = "—";

  for (const re of AMOUNT_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      amount = normalizeAmount(m[1]);
      break;
    }
  }

  for (const re of DATE_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      date = normalizeDate(m[1]);
      break;
    }
  }

  for (const re of VAT_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) {
      vat = m[1].trim();
      break;
    }
  }

  const supplier = findSupplier(text);
  const category = detectCategory(text);

  return { amount, date, supplier, vat, category };
}
