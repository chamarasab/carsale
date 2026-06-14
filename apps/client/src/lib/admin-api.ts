const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type VehicleCategory = {
  _id: string;
  code: string;
  meaning: string;
  maker?: string;
  model?: string;
  grades?: string[];
  yearFrom?: number;
  yearTo?: number;
  bodyType?: string;
  vehicleType?: string;
  fuelType?: string;
  driveType?: string;
  transmission?: string;
  engineCapacity?: number;
  defaultDepreciationRate?: number;
  defaultExciseRatePerUnitLkr?: number;
  defaultExciseDutyLkr?: number;
  defaultLuxuryThresholdLkr?: number;
  defaultLuxuryRate?: number;
  notes?: string;
  sourceRefs?: string[];
  active?: boolean;
};

export type VehicleCategoryInput = Omit<VehicleCategory, '_id'>;

export type CreateCarAdInput = {
  title: string;
  maker: string;
  model: string;
  modelCode?: string;
  categoryId?: string;
  categoryMeaning?: string;
  year: number;
  mileageKm: number;
  fuelType: string;
  transmission: string;
  auctionGrade: string;
  chassisCode: string;
  location: string;
  source?: string;
  sourceUrl?: string;
  images: string[];
  features: string[];
  cost: {
    auctionPriceJpy: number;
    exchangeRateLkr: number;
    yellowBookValueJpy?: number;
    depreciationRate?: number;
    freightJpy?: number;
    insuranceJpy?: number;
    vehicleType?: string;
    fuelType?: string;
    engineCapacity?: number;
    manufactureYear?: number;
    exciseRatePerUnitLkr?: number;
    exciseDutyLkr?: number;
    luxuryThresholdLkr?: number;
    luxuryRate?: number;
    vehicleEntitlementLevyLkr?: number;
    bankChargesLkr?: number;
    clearingChargesLkr?: number;
    supplierCommissionLkr?: number;
    importerCommissionLkr?: number;
    depositLkr?: number;
    portHandlingLkr?: number;
    localTransportLkr?: number;
    serviceFeeLkr?: number;
  };
  status?: 'available' | 'reserved' | 'sold';
  published?: boolean;
};

export type TaxSettings = {
  name: string;
  effectiveFrom: string;
  notes?: string;
  cidRate: number;
  cidSurchargeRate: number;
  vatRate: number;
  ssclRate: number;
  defaultDepreciationRate: number;
  comExmSealLkr: number;
  luxuryThresholds: {
    petrol: number;
    diesel: number;
    hybrid: number;
    electric: number;
  };
  luxuryBands: Array<{
    upToExcessLkr: number | null;
    rate: number;
  }>;
};

export async function getTaxSettings() {
  const response = await fetch(`${apiUrl}/settings/tax`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not load tax settings');
  }
  return (await response.json()) as TaxSettings;
}

export async function getVehicleCategories() {
  const response = await fetch(`${apiUrl}/categories`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not load vehicle categories');
  }
  return (await response.json()) as VehicleCategory[];
}

export async function createVehicleCategory(category: VehicleCategoryInput, idToken: string) {
  const response = await fetch(`${apiUrl}/categories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(category),
  });

  if (!response.ok) {
    throw new Error('Could not create vehicle category');
  }

  return (await response.json()) as VehicleCategory;
}

export async function createCarAdvertisement(car: CreateCarAdInput, idToken: string) {
  const response = await fetch(`${apiUrl}/cars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(car),
  });

  if (!response.ok) {
    throw new Error('Could not create vehicle advertisement');
  }

  return response.json();
}

export async function updateTaxSettings(settings: TaxSettings, idToken: string) {
  const response = await fetch(`${apiUrl}/settings/tax`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    throw new Error('Could not update tax settings');
  }

  return (await response.json()) as TaxSettings;
}

export async function recalculateCars(idToken: string) {
  const response = await fetch(`${apiUrl}/cars/recalculate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    throw new Error('Could not recalculate cars');
  }

  return (await response.json()) as { recalculated: number };
}
