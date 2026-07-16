export const AUCTION_GRADES = ['S', '6', '5', '4.5', '4', '3.5', '3', '2', '1', 'R', 'RA'] as const;

export type AuctionGrade = (typeof AUCTION_GRADES)[number];

export function normalizeAuctionGrade(value: unknown): AuctionGrade | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;

  const normalized = String(value).trim().toUpperCase();
  const numeric = normalized.endsWith('.0') ? normalized.slice(0, -2) : normalized;
  return AUCTION_GRADES.find((grade) => grade === numeric);
}
