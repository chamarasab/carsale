import type { Car } from '@/lib/types';

export type InventoryMarket = 'japan' | 'sri-lanka';

const scrapedSources = new Set(['jp center', 'a-automarket']);

export function inventoryMarket(car: Car): InventoryMarket {
  const source = car.source.trim().toLowerCase();

  if (scrapedSources.has(source)) return 'japan';
  if (car.createdBy) return 'sri-lanka';

  const location = car.location.trim().toLowerCase();
  if (location.includes('sri lanka') || location.includes('colombo')) return 'sri-lanka';

  return 'japan';
}
