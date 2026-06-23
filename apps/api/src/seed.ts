import { config } from 'dotenv';
import mongoose from 'mongoose';
import { Car, CarSchema } from './cars/car.schema';
import { calculateImportCost } from './cars/tax-calculator';
import { COMMON_VEHICLE_CATEGORIES } from './categories/common-vehicle-categories';
import { VehicleCategory, VehicleCategorySchema } from './categories/vehicle-category.schema';
import { DEFAULT_TAX_SETTINGS } from './settings/default-tax-settings';
import { TaxSettings, TaxSettingsSchema } from './settings/tax-settings.schema';

config();

const cars = [
  {
    title: '1998 Toyota Supra RZ Twin Turbo',
    maker: 'Toyota',
    model: 'Supra RZ',
    modelCode: 'JZA80',
    categoryMeaning: 'Toyota Supra fourth generation',
    year: 1998,
    mileageKm: 68000,
    fuelType: 'Petrol Twin Turbo',
    transmission: '6-speed manual',
    auctionGrade: '4',
    chassisCode: 'JZA80',
    location: 'USS Nagoya',
    source: 'Japan Auction',
    sourceUrl: 'https://example.com/auction/toyota-supra-rz',
    images: [
      '/jdm-supra.png',
      '/jdm-hero.webp'
    ],
    features: ['2JZ-GTE twin turbo', 'Getrag manual', 'Factory aero', 'Collector grade JDM icon'],
    cost: {
      auctionPriceJpy: 8200000,
      exchangeRateLkr: 2.08,
      yellowBookValueJpy: 9550000,
      depreciationRate: 0.85,
      freightJpy: 280000,
      insuranceJpy: 50000,
      vehicleType: 'Car',
      fuelType: 'Petrol',
      engineCapacity: 3000,
      manufactureYear: 1998,
      exciseDutyLkr: 7200000,
      luxuryThresholdLkr: 5000000,
      bankChargesLkr: 45000,
      clearingChargesLkr: 220000,
      supplierCommissionLkr: 850000,
      importerCommissionLkr: 650000,
      localTransportLkr: 95000,
      depositLkr: 250000
    },
    status: 'available',
    published: true
  },
  {
    title: '1999 Nissan Skyline GT-R V-Spec R34',
    maker: 'Nissan',
    model: 'Skyline GT-R',
    modelCode: 'BNR34',
    categoryMeaning: 'Nissan Skyline GT-R R34',
    year: 1999,
    mileageKm: 74000,
    fuelType: 'Petrol Twin Turbo',
    transmission: '6-speed manual',
    auctionGrade: '4.5',
    chassisCode: 'BNR34',
    location: 'USS Tokyo',
    source: 'Japan Auction',
    sourceUrl: 'https://example.com/auction/skyline-gtr-r34',
    images: [
      '/jdm-gtr.png',
      '/jdm-hero.webp'
    ],
    features: ['RB26DETT', 'ATTESA E-TS AWD', 'V-Spec aero', 'Auction sheet verified'],
    cost: {
      auctionPriceJpy: 14800000,
      exchangeRateLkr: 2.08,
      yellowBookValueJpy: 17200000,
      depreciationRate: 0.85,
      freightJpy: 300000,
      insuranceJpy: 65000,
      vehicleType: 'Car',
      fuelType: 'Petrol',
      engineCapacity: 2600,
      manufactureYear: 1999,
      exciseDutyLkr: 9800000,
      luxuryThresholdLkr: 5000000,
      bankChargesLkr: 65000,
      clearingChargesLkr: 240000,
      supplierCommissionLkr: 1250000,
      importerCommissionLkr: 850000,
      localTransportLkr: 105000,
      depositLkr: 300000
    },
    status: 'available',
    published: true
  },
  {
    title: '1993 Honda NSX NA1 Coupe',
    maker: 'Honda',
    model: 'NSX',
    modelCode: 'NA1',
    categoryMeaning: 'Honda NSX first generation',
    year: 1993,
    mileageKm: 59000,
    fuelType: 'Petrol V6',
    transmission: '5-speed manual',
    auctionGrade: '5',
    chassisCode: 'NA1',
    location: 'TAA Yokohama',
    source: 'Japan Auction',
    sourceUrl: 'https://example.com/auction/honda-nsx-na1',
    images: [
      '/jdm-nsx.png',
      '/jdm-hero.webp'
    ],
    features: ['Mid-engine layout', 'VTEC V6', 'Aluminium body', 'Low-mile collector car'],
    cost: {
      auctionPriceJpy: 11200000,
      exchangeRateLkr: 2.08,
      yellowBookValueJpy: 13800000,
      depreciationRate: 0.85,
      freightJpy: 300000,
      insuranceJpy: 60000,
      vehicleType: 'Car',
      fuelType: 'Petrol',
      engineCapacity: 3200,
      manufactureYear: 1993,
      exciseDutyLkr: 8500000,
      luxuryThresholdLkr: 5000000,
      bankChargesLkr: 60000,
      clearingChargesLkr: 235000,
      supplierCommissionLkr: 1000000,
      importerCommissionLkr: 775000,
      localTransportLkr: 95000,
      depositLkr: 300000
    },
    status: 'reserved',
    published: true
  },
  {
    title: '2000 Mitsubishi Lancer Evolution VI TME',
    maker: 'Mitsubishi',
    model: 'Lancer Evolution VI',
    modelCode: 'CP9A',
    categoryMeaning: 'Mitsubishi Lancer Evolution VI',
    year: 2000,
    mileageKm: 81000,
    fuelType: 'Petrol Turbo',
    transmission: '5-speed manual',
    auctionGrade: '4',
    chassisCode: 'CP9A',
    location: 'JU Aichi',
    source: 'Japan Auction',
    sourceUrl: 'https://example.com/auction/evo-vi-tme',
    images: [
      '/jdm-evo.png',
      '/jdm-hero.webp'
    ],
    features: ['4G63 turbo', 'AWD rally platform', 'Tommi Makinen Edition', 'Brembo brakes'],
    cost: {
      auctionPriceJpy: 6900000,
      exchangeRateLkr: 2.08,
      yellowBookValueJpy: 7800000,
      depreciationRate: 0.85,
      freightJpy: 260000,
      insuranceJpy: 45000,
      vehicleType: 'Car',
      fuelType: 'Petrol',
      engineCapacity: 2000,
      manufactureYear: 2000,
      exciseDutyLkr: 6200000,
      luxuryThresholdLkr: 5000000,
      bankChargesLkr: 45000,
      clearingChargesLkr: 215000,
      supplierCommissionLkr: 720000,
      importerCommissionLkr: 590000,
      localTransportLkr: 90000,
      depositLkr: 250000
    },
    status: 'available',
    published: true
  }
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB ?? 'carsale' });
  const CarModel = mongoose.model(Car.name, CarSchema);
  const TaxSettingsModel = mongoose.model(TaxSettings.name, TaxSettingsSchema);
  const VehicleCategoryModel = mongoose.model(VehicleCategory.name, VehicleCategorySchema);
  const taxSettings = await TaxSettingsModel.findOneAndUpdate(
    { key: DEFAULT_TAX_SETTINGS.key },
    DEFAULT_TAX_SETTINGS,
    { new: true, upsert: true },
  ).lean();

  for (const category of COMMON_VEHICLE_CATEGORIES) {
    await VehicleCategoryModel.findOneAndUpdate({ code: category.code }, category, { new: true, upsert: true });
  }

  await CarModel.deleteMany({});
  await CarModel.insertMany(
    cars.map((car) => ({
      ...car,
      cost: calculateImportCost(car.cost, taxSettings ?? DEFAULT_TAX_SETTINGS),
    })),
  );

  await mongoose.disconnect();
  console.log(`Seeded ${cars.length} cars and ${COMMON_VEHICLE_CATEGORIES.length} vehicle categories`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
