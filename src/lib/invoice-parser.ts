import { Currency, OllinFinanceEntry } from './finance-types';

export const parseInvoiceFromChat = (input: string): Partial<OllinFinanceEntry> | null => {
  const amountMatch = input.match(/\d+/);
  if (!amountMatch) return null;

  const amount = parseInt(amountMatch[0]);
  let currency: Currency = 'USD';
  
  if (input.includes('ש"ח') || input.includes('שקל') || input.includes('ILS')) currency = 'ILS';
  if (input.includes('יורו') || input.includes('EUR') || input.includes('€')) currency = 'EUR';
  
  return {
    id: Math.random().toString(36).substring(2, 11),
    amount,
    currency,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    description: input
  };
};