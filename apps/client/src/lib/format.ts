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
