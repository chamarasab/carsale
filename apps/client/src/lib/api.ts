import { Car, CarSummary } from './types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://carsale-1.onrender.com/api';
const apiPublicUrl = apiUrl.replace(/\/api\/?$/, '');

export async function getCars(): Promise<CarSummary[]> {
  try {
    const response = await fetch(`${apiUrl}/cars`, { cache: 'no-store' });
    if (!response.ok) return [];
    return normalizeCars((await response.json()) as CarSummary[]);
  } catch {
    return [];
  }
}

export async function getCar(id: string): Promise<Car | null> {
  try {
    const response = await fetch(`${apiUrl}/cars/${id}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return normalizeCar((await response.json()) as Car);
  } catch {
    return null;
  }
}

export async function getExchangeRate() {
  try {
    const response = await fetch(`${apiUrl}/settings/exchange-rate`, { next: { revalidate: 60 * 60 * 6 } });
    if (!response.ok) return null;
    return (await response.json()) as {
      base: 'JPY';
      quote: 'LKR';
      rate: number;
      date: string;
      provider: string;
      source: string;
      fallback: boolean;
    };
  } catch {
    return null;
  }
}

export async function createInquiry(payload: {
  carId: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
}) {
  const response = await fetch(`${apiUrl}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Inquiry could not be submitted');
  }

  return response.json();
}

function normalizeCars<T extends CarSummary>(cars: T[]) {
  return cars.map(normalizeCar);
}

function normalizeCar<T extends CarSummary>(car: T): T {
  return {
    ...car,
    images: car.images.map((image) =>
      image.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):4000/i, apiPublicUrl),
    ),
  } as T;
}
