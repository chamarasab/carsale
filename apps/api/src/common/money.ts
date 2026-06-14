export const toLkr = (value: number) => Math.round(value);

export function calculateTotalLkr(parts: Record<string, number>) {
  return toLkr(Object.values(parts).reduce((sum, value) => sum + value, 0));
}
