'use client';

import { RefreshCcw, Save } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { getTaxSettings, recalculateCars, TaxSettings, updateTaxSettings } from '@/lib/admin-api';

const percentFields = [
  ['cidRate', 'CID rate'],
  ['cidSurchargeRate', 'CID surcharge rate'],
  ['vatRate', 'VAT rate'],
  ['ssclRate', 'SSCL rate'],
  ['defaultDepreciationRate', 'Default depreciation'],
] as const;

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<TaxSettings | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTaxSettings()
      .then(setSettings)
      .catch(() => setMessage('Could not load tax settings.'));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || !session?.idToken) {
      setMessage('Sign in with an admin Google account first.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await updateTaxSettings(settings, session.idToken);
      const result = await recalculateCars(session.idToken);
      setMessage(`Saved tax policy and recalculated ${result.recalculated} cars.`);
    } catch {
      setMessage('Could not save. Check admin email, Google OAuth, and API logs.');
    } finally {
      setSaving(false);
    }
  }

  function setNumber(path: string, value: string) {
    const number = Number(value);
    setSettings((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      const keys = path.split('.');
      let target: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
      target[keys[keys.length - 1]] = Number.isNaN(number) ? 0 : number;
      return next;
    });
  }

  return (
    <main>
      <Nav />
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-wide text-signal">Admin</p>
          <h1 className="mt-2 text-4xl font-black text-ink">Tax policy settings</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-graphite">
            Update government tax defaults here when rates change. Existing vehicle advertisements are recalculated
            after saving.
          </p>
          <Link className="mt-5 inline-flex h-11 items-center justify-center border border-black/15 px-4 text-sm font-black text-ink hover:border-signal" href="/admin/vehicles">
            Vehicle advertisements
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {status !== 'authenticated' ? (
          <div className="border border-black/10 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-black text-ink">Admin login required</h2>
            <p className="mt-2 text-sm text-graphite">Use Google login from the header, then return to this page.</p>
            <Link className="mt-4 inline-flex bg-signal px-4 py-3 text-sm font-black text-white" href="/login">
              Go to login
            </Link>
          </div>
        ) : null}

        {settings ? (
          <form className="grid gap-6 lg:grid-cols-[1fr_360px]" onSubmit={onSubmit}>
            <div className="space-y-6">
              <div className="border border-black/10 bg-white p-5 shadow-soft">
                <h2 className="text-xl font-black text-ink">Policy</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-graphite">
                    Name
                    <input
                      className="h-11 border border-black/15 px-3 text-ink"
                      value={settings.name}
                      onChange={(event) => setSettings({ ...settings, name: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-graphite">
                    Effective from
                    <input
                      className="h-11 border border-black/15 px-3 text-ink"
                      type="date"
                      value={settings.effectiveFrom}
                      onChange={(event) => setSettings({ ...settings, effectiveFrom: event.target.value })}
                    />
                  </label>
                </div>
                <label className="mt-4 grid gap-2 text-sm font-bold text-graphite">
                  Notes
                  <textarea
                    className="min-h-24 border border-black/15 px-3 py-3 text-ink"
                    value={settings.notes ?? ''}
                    onChange={(event) => setSettings({ ...settings, notes: event.target.value })}
                  />
                </label>
              </div>

              <div className="border border-black/10 bg-white p-5 shadow-soft">
                <h2 className="text-xl font-black text-ink">Tax percentages</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {percentFields.map(([field, label]) => (
                    <label className="grid gap-2 text-sm font-bold text-graphite" key={field}>
                      {label}
                      <input
                        className="h-11 border border-black/15 px-3 text-ink"
                        min="0"
                        step="0.001"
                        type="number"
                        value={settings[field]}
                        onChange={(event) => setNumber(field, event.target.value)}
                      />
                    </label>
                  ))}
                  <label className="grid gap-2 text-sm font-bold text-graphite">
                    COM / Exm / Seal fee
                    <input
                      className="h-11 border border-black/15 px-3 text-ink"
                      min="0"
                      step="1"
                      type="number"
                      value={settings.comExmSealLkr}
                      onChange={(event) => setNumber('comExmSealLkr', event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="border border-black/10 bg-white p-5 shadow-soft">
                <h2 className="text-xl font-black text-ink">Luxury thresholds</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Object.entries(settings.luxuryThresholds).map(([key, value]) => (
                    <label className="grid gap-2 text-sm font-bold capitalize text-graphite" key={key}>
                      {key}
                      <input
                        className="h-11 border border-black/15 px-3 text-ink"
                        min="0"
                        step="1000"
                        type="number"
                        value={value}
                        onChange={(event) => setNumber(`luxuryThresholds.${key}`, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <aside className="h-fit border border-black/10 bg-ink p-5 text-white shadow-soft">
              <h2 className="text-xl font-black">Luxury bands</h2>
              <div className="mt-4 space-y-3">
                {settings.luxuryBands.map((band, index) => (
                  <div className="grid grid-cols-2 gap-2" key={index}>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-white/58">
                      Up to excess
                      <input
                        className="h-10 border border-white/15 bg-white/8 px-2 text-white"
                        min="0"
                        step="1000"
                        type="number"
                        value={band.upToExcessLkr ?? ''}
                        placeholder="No limit"
                        onChange={(event) => {
                          const next = structuredClone(settings);
                          next.luxuryBands[index].upToExcessLkr = event.target.value ? Number(event.target.value) : null;
                          setSettings(next);
                        }}
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-white/58">
                      Rate
                      <input
                        className="h-10 border border-white/15 bg-white/8 px-2 text-white"
                        min="0"
                        step="0.001"
                        type="number"
                        value={band.rate}
                        onChange={(event) => {
                          const next = structuredClone(settings);
                          next.luxuryBands[index].rate = Number(event.target.value);
                          setSettings(next);
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <button
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 bg-signal px-4 text-sm font-black text-white hover:bg-red-700 disabled:bg-graphite"
                disabled={saving || status !== 'authenticated'}
                type="submit"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save and recalculate'}
              </button>
              <button
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 border border-white/15 px-4 text-sm font-black text-white hover:border-white"
                disabled={saving || !session?.idToken}
                onClick={async () => {
                  if (!session?.idToken) return;
                  const result = await recalculateCars(session.idToken);
                  setMessage(`Recalculated ${result.recalculated} cars.`);
                }}
                type="button"
              >
                <RefreshCcw size={16} />
                Recalculate only
              </button>
              {message ? <p className="mt-4 text-sm font-bold text-white/76">{message}</p> : null}
            </aside>
          </form>
        ) : null}
      </section>
    </main>
  );
}
