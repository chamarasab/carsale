import { Car } from './types';
import jpCenterCars from '../../public/jpcenter-cars.json';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const apiPublicUrl = apiUrl.replace(/\/api\/?$/, '');
const fallbackCars = normalizeCars(jpCenterCars as Car[]);

export async function getCars() {
  try {
    const response = await fetch(`${apiUrl}/cars`, { cache: 'no-store' });
    if (!response.ok) {
      return fallbackCars;
    }
    const cars = normalizeCars((await response.json()) as Car[]);
    return cars.length > 0 ? cars : fallbackCars;
  } catch {
    return fallbackCars;
  }
}

export async function getCar(id: string) {
  try {
    const response = await fetch(`${apiUrl}/cars/${id}`, { cache: 'no-store' });
    if (!response.ok) {
      return fallbackCars.find((car) => car._id === id) ?? null;
    }
    return normalizeCar((await response.json()) as Car);
  } catch {
    return fallbackCars.find((car) => car._id === id) ?? null;
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

function normalizeCars(cars: Car[]) {
  return cars.map(normalizeCar);
}

function normalizeCar(car: Car) {
  return {
    ...car,
    images: car.images.map((image) =>
      image.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):4000/i, apiPublicUrl),
    ),
  };
}
