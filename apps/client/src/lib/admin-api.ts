import { Car } from './types';

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

export type AppUser = {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  active: boolean;
  createdAt?: string;
};

export type ScrapeJobResult = {
  maker: string;
  model: string;
  fetched: number;
  imported: number;
  inserted: number;
  updated: number;
  error?: string;
};

export type ScrapeRun = {
  _id: string;
  source: string;
  trigger: 'manual' | 'scheduled';
  status: 'running' | 'success' | 'partial' | 'failed' | 'interrupted';
  startedAt: string;
  finishedAt?: string;
  durationMs: number;
  fetched: number;
  eligible?: number;
  imported: number;
  inserted: number;
  updated: number;
  failedJobs: number;
  jobs: ScrapeJobResult[];
  errors: string[];
  phase?: string;
};

export type ScraperStatus = {
  source: string;
  sourceUrl: string;
  enabled: boolean;
  running: boolean;
  schedule: string;
  configuredJobs: Array<{
    maker: string;
    model: string;
    pages?: number;
    listSize?: number;
    yearFrom?: number;
    yearTo?: number;
  }>;
  lastRun: ScrapeRun | null;
  lastRuns?: {
    jpCenter: ScrapeRun | null;
    automarket: ScrapeRun | null;
  };
  missingWebsiteValues?: number;
  runs: ScrapeRun[];
};

export type CreateCarAdInput = {
  title: string;
  maker: string;
  model: string;
  modelCode?: string;
  vehicleGrade?: string;
  categoryId?: string;
  categoryMeaning?: string;
  year: number;
  mileageKm: number;
  fuelType: string;
  transmission: string;
  auctionGrade: string;
  chassisCode: string;
  location: string;
  auctionDate?: string;
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
  vehicleEntitlementLevyLkr: number;
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

export type WebsiteValue = {
  _id: string;
  no: number;
  key: string;
  maker: string;
  model: string;
  vehicleModel: string;
  vehicleGrade: string;
  aliases: string[];
  drivetrain: '2WD' | '4WD';
  modelCodes: string[];
  price: number;
  currency: 'JPY';
  taxIncluded: boolean;
  consumptionTaxRate: number;
  customsDepreciationRate: number;
  sourceUrl: string;
  sourceDataUrl?: string;
  effectiveFrom?: string;
  lastSyncedAt?: string;
  active: boolean;
};

export type WebsiteValueInput = Omit<WebsiteValue, '_id' | 'lastSyncedAt'>;

export type WebsiteValueMiss = {
  _id: string;
  key: string;
  maker: string;
  model: string;
  title?: string;
  modelCode?: string;
  chassisCode?: string;
  vehicleGrade?: string;
  source?: string;
  sourceUrl?: string;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: 'missing' | 'resolved' | 'ignored';
};

export async function signupUser(input: { name: string; email: string; password: string }) {
  const response = await fetch(`${apiUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Could not create account');
  return (await response.json()) as {
    accessToken: string;
    user: { id: string; name: string; email: string; role: 'ADMIN' | 'USER' };
  };
}

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

  return (await response.json()) as Car;
}

export async function updateCarAdvertisement(id: string, car: CreateCarAdInput, idToken: string) {
  const response = await fetch(`${apiUrl}/cars/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(car),
  });

  if (!response.ok) {
    throw new Error('Could not update vehicle advertisement');
  }

  return (await response.json()) as Car;
}

export async function getManageableCars(accessToken: string) {
  const response = await fetch(`${apiUrl}/cars/manage`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Could not load advertisements');
  }
  return (await response.json()) as Car[];
}

export async function getPendingCars(accessToken: string) {
  const response = await fetch(`${apiUrl}/cars/pending`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Could not load pending advertisements');
  }
  return (await response.json()) as Car[];
}

export async function setCarPublished(id: string, published: boolean, accessToken: string) {
  const response = await fetch(`${apiUrl}/cars/${id}/published`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ published }),
  });

  if (!response.ok) {
    throw new Error('Could not update advertisement');
  }

  return (await response.json()) as Car;
}

export async function deleteCarAdvertisement(id: string, accessToken: string) {
  const response = await fetch(`${apiUrl}/cars/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Could not delete advertisement');
  }
  return (await response.json()) as { deleted: true };
}

export async function getScraperStatus(accessToken: string) {
  const response = await fetch(`${apiUrl}/scraper/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Could not load scraper status');
  return (await response.json()) as ScraperStatus;
}

export async function runScraper(accessToken: string) {
  const response = await fetch(`${apiUrl}/scraper/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Could not start scraper');
  return (await response.json()) as { started: boolean; reason?: string; runId?: string };
}

export async function runAutomarketScraper(
  input: {
    maker: string;
    model: string;
    auctionGrade?: string;
    yearFrom?: number;
    yearTo?: number;
    listSize?: number;
    allUpcoming?: boolean;
  },
  accessToken: string,
) {
  const response = await fetch(`${apiUrl}/scraper/automarket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...input, auctionGrade: input.auctionGrade || undefined }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Could not run Automarket scraper');
  return result as {
    started: boolean;
    reason?: string;
    runId?: string;
  };
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

export async function getWebsiteValues(accessToken: string) {
  const response = await fetch(`${apiUrl}/website-values`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Could not load manufacturer website values');
  return (await response.json()) as WebsiteValue[];
}

export async function getMissingWebsiteValues(accessToken: string) {
  const response = await fetch(`${apiUrl}/website-values/missing`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Could not load missing website values');
  return (await response.json()) as WebsiteValueMiss[];
}

export async function ignoreMissingWebsiteValue(id: string, accessToken: string) {
  const response = await fetch(`${apiUrl}/website-values/missing/${id}/ignore`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Could not dismiss missing website value');
  return (await response.json()) as WebsiteValueMiss;
}

export async function createWebsiteValue(input: WebsiteValueInput, accessToken: string) {
  const response = await fetch(`${apiUrl}/website-values`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Could not create manufacturer website value');
  return (await response.json()) as WebsiteValue;
}

export async function updateWebsiteValue(id: string, input: WebsiteValueInput, accessToken: string) {
  const response = await fetch(`${apiUrl}/website-values/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Could not update manufacturer website value');
  return (await response.json()) as WebsiteValue;
}

export async function deleteWebsiteValue(id: string, accessToken: string) {
  const response = await fetch(`${apiUrl}/website-values/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Could not delete manufacturer website value');
  return (await response.json()) as { deleted: boolean; deactivated?: boolean };
}

export async function refreshWebsiteValues(accessToken: string) {
  const response = await fetch(`${apiUrl}/website-values/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Could not refresh manufacturer website values');
  return (await response.json()) as {
    fetched: number;
    updated: number;
    failed: number;
    syncedAt: string;
    sources: Array<{
      id: string;
      label: string;
      sourceUrl: string;
      fetched: number;
      updated: number;
      syncedAt?: string;
      error?: string;
    }>;
  };
}

export async function uploadCarImages(files: File[], accessToken: string) {
  const body = new FormData();
  files.forEach((file) => body.append('images', file));
  const response = await fetch(`${apiUrl}/uploads/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
  if (!response.ok) throw new Error('Could not upload images');
  return (await response.json()) as string[];
}

export async function getUsers(accessToken: string) {
  const response = await fetch(`${apiUrl}/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Could not load users');
  return (await response.json()) as AppUser[];
}

export async function createUser(
  input: { name: string; email: string; password: string },
  accessToken: string,
) {
  const response = await fetch(`${apiUrl}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Could not create user');
  return (await response.json()) as AppUser;
}

export async function setUserActive(id: string, active: boolean, accessToken: string) {
  const response = await fetch(`${apiUrl}/users/${id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ active }),
  });
  if (!response.ok) throw new Error('Could not update user');
  return (await response.json()) as AppUser;
}
