/**
 * SHA-256 content hash for document integrity (digitally signed).
 */

export async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build a canonical string from document content for hashing (exclude auditTrail). */
export function documentCanonicalString(doc: {
  id: string;
  number: string;
  type: string;
  clientId: string;
  clientName: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; discountPct?: number }>;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  date: string;
}): string {
  const itemsStr = doc.items
    .map((i) => `${i.description}|${i.quantity}|${i.unitPrice}${(i.discountPct ?? 0) > 0 ? `|${i.discountPct}` : ""}`)
    .join(";");
  return [
    doc.id,
    doc.number,
    doc.type,
    doc.clientId,
    doc.clientName,
    itemsStr,
    doc.subtotal,
    doc.vatRate,
    doc.vatAmount,
    doc.total,
    doc.date,
  ].join("\n");
}
