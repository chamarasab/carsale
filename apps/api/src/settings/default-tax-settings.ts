export const DEFAULT_TAX_SETTINGS = {
  key: 'active-tax-policy',
  name: 'Sri Lanka vehicle import tax policy',
  effectiveFrom: '2026-05-16',
  notes: 'Defaults based on PiXAMP-visible 2026 calculator structure. Confirm final liability with a clearing agent.',
  cidRate: 0.3,
  cidSurchargeRate: 0.5,
  vatRate: 0.18,
  ssclRate: 0.025,
  defaultDepreciationRate: 0.85,
  comExmSealLkr: 1750,
  luxuryThresholds: {
    petrol: 5_000_000,
    diesel: 5_000_000,
    hybrid: 5_500_000,
    electric: 6_000_000,
  },
  luxuryBands: [
    { upToExcessLkr: 2_500_000, rate: 0.6 },
    { upToExcessLkr: 5_000_000, rate: 0.8 },
    { upToExcessLkr: null, rate: 1.2 },
  ],
};

export type TaxSettingsValue = typeof DEFAULT_TAX_SETTINGS;
