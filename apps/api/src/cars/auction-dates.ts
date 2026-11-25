export const SCRAPED_AUCTION_SOURCES = ['JP Center', 'A-Automarket'] as const;

/**
 * Normalizes ISO or dot/slash/dash DD.MM.YYYY auction dates to YYYY-MM-DD.
 */
export function normalizeAuctionDate(value?: string) {
  const text = value?.trim();
  if (!text) return undefined;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const local = text.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/);
  const parts = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : undefined;
  if (!parts) return undefined;
  const [year, month, day] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Returns the current calendar date in Asia/Colombo as YYYY-MM-DD.
 */
export function colomboDateKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
