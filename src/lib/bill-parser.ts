/**
 * Bill AI ingestion: extract Provider, Amount, Due Date from photo/PDF.
 * Mock parser simulates Electric, Water, or Municipality bills. Replace with real OCR/API in production.
 */

export type BillExtractionCategory = "electricity" | "water" | "vaad_bayit" | "other";

export interface BillExtraction {
  provider: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  currency: string;
  category?: BillExtractionCategory;
}

const MOCK_BILLS: Omit<BillExtraction, "dueDate">[] = [
  { provider: "Israel Electric Corporation", amount: 342.5, currency: "ILS", category: "electricity" },
  { provider: "IEC (Electric)", amount: 278.0, currency: "ILS", category: "electricity" },
  { provider: "Mekorot / Water Authority", amount: 156.0, currency: "ILS", category: "water" },
  { provider: "Municipal Water", amount: 89.5, currency: "ILS", category: "water" },
  { provider: "Va'ad Bayit (Building Committee)", amount: 420.0, currency: "ILS", category: "vaad_bayit" },
  { provider: "City Municipality", amount: 185.0, currency: "ILS", category: "vaad_bayit" },
];

function pickMockBill(fileName: string): Omit<BillExtraction, "dueDate"> {
  const lower = fileName.toLowerCase();
  if (/\b(electric|iec|חשמל|electricity)\b/.test(lower)) return MOCK_BILLS[0];
  if (/\b(water|mekorot|מים)\b/.test(lower)) return MOCK_BILLS[2];
  if (/\b(vaad|municipality|עירייה|ועד)\b/.test(lower)) return MOCK_BILLS[4];
  return MOCK_BILLS[Math.floor(Math.random() * MOCK_BILLS.length)];
}

export async function parseBillFromFile(file: File): Promise<BillExtraction | null> {
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") return null;
  await new Promise((r) => setTimeout(r, 900));
  const today = new Date();
  const dueDay = 15 + (Math.floor(Math.random() * 10));
  const nextDue = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dueDay, 28));
  const base = pickMockBill(file.name);
  return {
    ...base,
    dueDate: nextDue.toISOString().slice(0, 10),
  };
}
