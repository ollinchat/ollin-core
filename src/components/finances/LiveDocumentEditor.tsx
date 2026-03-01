"use client";

import type { LineItem } from "@/lib/finance-types";
import { DEFAULT_VAT_RATE, subtotalFromItems, vatFromSubtotal } from "@/lib/finance-types";
import { QUOTE_HEADER_EN, QUOTE_HEADER_HE, TAX_INVOICE_HEADER_EN, TAX_INVOICE_HEADER_HE } from "@/lib/finance-types";

type DocKind = "quote" | "invoice";

type LiveDocumentEditorProps = {
  kind: DocKind;
  locale: "en" | "he";
  number: string;
  companyName: string;
  companyNameHe?: string;
  /** Company address (right side of header) */
  companyAddress?: string;
  /** Logo URL (left side of header) */
  logoUrl?: string;
  clientName: string;
  clientAddress?: string;
  date: string;
  dueDate?: string;
  items: LineItem[];
  vatRate: number;
  notes?: string;
  onItemsChange: (items: LineItem[]) => void;
  onVatRateChange: (rate: number) => void;
  onNotesChange?: (notes: string) => void;
  onDateChange?: (date: string) => void;
  onDueDateChange?: (date: string) => void;
  editable?: boolean;
  /** Show QR code placeholder for payment */
  showQrPlaceholder?: boolean;
  /** Data URL for signature image (or show placeholder) */
  signatureDataUrl?: string;
};

/** A4 pixel dimensions at 96dpi: 794 × 1123 */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export function LiveDocumentEditor({
  kind,
  locale,
  number,
  companyName,
  companyNameHe,
  companyAddress,
  logoUrl,
  clientName,
  clientAddress,
  date,
  dueDate,
  items,
  vatRate,
  notes,
  onItemsChange,
  onVatRateChange,
  onNotesChange,
  onDateChange,
  onDueDateChange,
  editable = true,
  showQrPlaceholder = false,
  signatureDataUrl,
}: LiveDocumentEditorProps) {
  const titleEn = kind === "quote" ? QUOTE_HEADER_EN : TAX_INVOICE_HEADER_EN;
  const titleHe = kind === "quote" ? QUOTE_HEADER_HE : TAX_INVOICE_HEADER_HE;
  const subtotal = subtotalFromItems(items);
  const vatAmount = vatFromSubtotal(subtotal, vatRate);
  const total = subtotal + vatAmount;

  const addRow = () => {
    onItemsChange([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    onItemsChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    onItemsChange(items.filter((i) => i.id !== id));
  };

  const descLabel = locale === "he" ? "תיאור" : "Description";
  const qtyLabel = locale === "he" ? "כמות" : "Qty";
  const priceLabel = locale === "he" ? "מחיר" : "Price";
  const totalLabel = locale === "he" ? "סה\"כ" : "Total";
  const subtotalLabel = locale === "he" ? "סיכום ביניים" : "Subtotal";
  const vatLabel = locale === "he" ? "מע\"מ" : "VAT";
  const notesLabel = locale === "he" ? "הערות (אחריות/משך)" : "Notes (Warranty/Duration)";
  const dueLabel = locale === "he" ? "תאריך פירעון" : "Due date";
  const legalFooterEn = "This document is valid as a tax invoice / quote per applicable law. Payment terms as agreed.";
  const legalFooterHe = "מסמך זה תקף כחשבונית מס / הצעת מחיר לפי הדין. תנאי תשלום בהתאם להסכמה.";
  const sigLabel = locale === "he" ? "חתימה דיגיטלית" : "Authorized signature";

  return (
    <div
      className="bg-white border border-[#008080]/30 shadow-md overflow-hidden mx-auto"
      style={{ maxWidth: A4_WIDTH_PX, width: "100%", aspectRatio: "210/297", borderRadius: 0 }}
    >
      <div className="h-full flex flex-col text-gray-900 p-6" style={{ fontSize: "11px" }}>
        {/* Header: Logo left, Company info right — pixel-perfect A4 */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-[#008080] pb-3 mb-3">
          <div className="flex-shrink-0 w-24 h-24 border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-gray-400 text-xs">Logo</span>
            )}
          </div>
          <div className="text-right flex-1 min-w-0">
            <h1 className="text-[#008080] font-bold text-sm">{locale === "he" ? titleHe : titleEn}</h1>
            <p className="text-gray-500 text-xs mt-0.5">#{number}</p>
            <p className="font-semibold text-gray-900 mt-1">{locale === "he" && companyNameHe ? companyNameHe : companyName}</p>
            {companyAddress && <p className="text-gray-600 text-xs mt-0.5">{companyAddress}</p>}
          </div>
        </header>

        {/* Client block */}
        <div className="mt-2 border border-gray-200 p-2 bg-gray-50/50" style={{ borderRadius: 0 }}>
          <p className="font-medium">{clientName}</p>
          {clientAddress && <p className="text-gray-600 text-xs mt-0.5">{clientAddress}</p>}
        </div>

        {/* Date / Due */}
        <div className="flex gap-4 mt-2 text-gray-600 flex-wrap">
          <span>Date: {editable && onDateChange ? <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} className="border border-gray-300 px-1" style={{ borderRadius: 0 }} /> : date}</span>
          {(editable && onDueDateChange) || dueDate ? (
            <span>{dueLabel}: {editable && onDueDateChange ? <input type="date" value={dueDate || ""} onChange={(e) => onDueDateChange(e.target.value)} className="border border-gray-300 px-1" style={{ borderRadius: 0 }} /> : (dueDate || "—")}</span>
          ) : null}
        </div>

        {/* Table */}
        <table className="w-full mt-3 border-collapse text-xs">
          <thead>
            <tr className="bg-[#008080]/10 border-b border-gray-200">
              <th className="text-left py-1.5 px-1 font-semibold">{descLabel}</th>
              <th className="text-right w-12">{qtyLabel}</th>
              <th className="text-right w-16">{priceLabel}</th>
              <th className="text-right w-16">{totalLabel}</th>
              {editable && <th className="w-6" />}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b border-gray-100">
                <td className="py-1 px-1">
                  {editable ? (
                    <input
                      value={row.description}
                      onChange={(e) => updateItem(row.id, { description: e.target.value })}
                      className="w-full rounded-sm border border-gray-200 px-1 py-0.5"
                      placeholder="—"
                    />
                  ) : (
                    row.description || "—"
                  )}
                </td>
                <td className="text-right">
                  {editable ? (
                    <input
                      type="number"
                      min={0}
                      value={row.quantity}
                      onChange={(e) => updateItem(row.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-10 text-right rounded-sm border border-gray-200 px-1 py-0.5"
                    />
                  ) : (
                    row.quantity
                  )}
                </td>
                <td className="text-right">
                  {editable ? (
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.unitPrice}
                      onChange={(e) => updateItem(row.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-14 text-right rounded-sm border border-gray-200 px-1 py-0.5"
                    />
                  ) : (
                    row.unitPrice.toFixed(2)
                  )}
                </td>
                <td className="text-right font-medium">{(row.quantity * row.unitPrice).toFixed(2)}</td>
                {editable && (
                  <td>
                    <button type="button" onClick={() => removeItem(row.id)} className="text-red-500 hover:underline text-xs">×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && (
          <button type="button" onClick={addRow} className="mt-1 text-xs text-[#008080] font-medium hover:underline">
            + {locale === "he" ? "שורת פריט" : "Add line"}
          </button>
        )}

        {/* Totals */}
        <div className="mt-3 space-y-0.5 text-xs border-t border-gray-200 pt-2">
          <div className="flex justify-between">
            <span>{subtotalLabel}</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>{vatLabel} %</span>
            {editable ? (
              <input
                type="number"
                min={0}
                max={100}
                value={vatRate}
                onChange={(e) => onVatRateChange(parseFloat(e.target.value) || 0)}
                className="w-12 text-right rounded-sm border border-gray-200 px-1 py-0.5"
              />
            ) : (
              <span>{vatRate}%</span>
            )}
          </div>
          <div className="flex justify-between">
            <span>{vatLabel}</span>
            <span>{vatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1">
            <span>{totalLabel}</span>
            <span>{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        {(editable && onNotesChange) || notes ? (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-gray-500 text-xs mb-0.5">{notesLabel}</p>
            {editable ? (
              <textarea
                value={notes || ""}
                onChange={(e) => onNotesChange?.(e.target.value)}
                placeholder="—"
                rows={2}
                className="w-full border border-gray-200 px-2 py-1 text-xs"
                style={{ borderRadius: 0 }}
              />
            ) : (
              <p className="text-xs">{notes || "—"}</p>
            )}
          </div>
        ) : null}

        {/* Legal footer */}
        <footer className="mt-auto pt-3 border-t border-gray-200 text-[10px] text-gray-500">
          <p>{locale === "he" ? legalFooterHe : legalFooterEn}</p>
        </footer>

        {/* Bottom row: optional QR placeholder + signature placeholder */}
        <div className="flex items-end justify-between gap-4 mt-3 pt-2 border-t border-gray-100">
          {showQrPlaceholder && (
            <div className="w-20 h-20 border border-dashed border-[#008080]/40 flex items-center justify-center text-gray-400 text-[10px]">
              QR Payment
            </div>
          )}
          <div className="ml-auto flex flex-col items-end">
            <span className="text-[10px] text-gray-500 mb-1">{sigLabel}</span>
            {signatureDataUrl ? (
              <img src={signatureDataUrl} alt="Signature" className="h-10 object-contain" />
            ) : (
              <div className="w-32 h-10 border border-dashed border-[#008080]/40 flex items-center justify-center text-gray-400 text-[10px]" style={{ borderRadius: 0 }}>
                {locale === "he" ? "חתימה" : "Signature"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
