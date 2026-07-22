export function lkr(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function jpy(value: number) {
  return `¥${Math.round(value).toLocaleString('en-US')}`;
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('en-LK', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatAuctionDate(value: string | undefined, fallback = 'Date TBA') {
  if (!value) return fallback;

  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const local = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const parts = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : local
      ? [Number(local[3]), Number(local[2]), Number(local[1])]
      : null;

  if (!parts) return trimmed;

  const [year, month, day] = parts;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return trimmed;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}
