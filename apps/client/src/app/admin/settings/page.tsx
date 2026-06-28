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
  const isAdmin = session?.user.role === 'ADMIN';

  useEffect(() => {
    getTaxSettings()
      .then(setSettings)
      .catch(() => setMessage('Could not load tax settings.'));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || !session?.accessToken) {
      setMessage('Sign in with an account first.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await updateTaxSettings(settings, session.accessToken);
      const result = await recalculateCars(session.accessToken);
      setMessage(`Saved tax policy and recalculated ${result.recalculated} cars.`);
    } catch {
      setMessage('Could not save. Check admin email, account credentials, and API logs.');
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
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-wide text-signal">Admin</p>
          <h1 className="mt-2 text-4xl font-black text-foreground">Tax policy settings</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Update government tax defaults here when rates change. Existing vehicle advertisements are recalculated
            after saving.
          </p>
          <Link className="mt-5 inline-flex h-11 items-center justify-center rounded-panel border border-line px-4 text-sm font-black text-foreground hover:border-signal" href="/admin/vehicles">
            Vehicle advertisements
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {status !== 'authenticated' || !isAdmin ? (
          <div className="rounded-panel border border-line bg-surface p-6 shadow-soft">
            <h2 className="text-xl font-black text-foreground">Administrator access required</h2>
            <p className="mt-2 text-sm text-muted">Only the administrator can update tax policy settings.</p>
            <Link className="bg-brand-gradient mt-4 inline-flex rounded-panel px-4 py-3 text-sm font-black text-white" href="/login">
              Go to login
            </Link>
          </div>
        ) : null}

        {settings && isAdmin ? (
          <form className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]" onSubmit={onSubmit}>
            <div className="min-w-0 space-y-6">
              <div className="rounded-panel border border-line bg-surface p-5 shadow-soft">
                <h2 className="text-xl font-black text-foreground">Policy</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-muted">
                    Name
                    <input
                      className="h-11 rounded-panel border border-line bg-field px-3 text-foreground focus:border-signal focus:ring-signal/15"
                      value={settings.name}
                      onChange={(event) => setSettings({ ...settings, name: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-muted">
                    Effective from
                    <input
                      className="h-11 rounded-panel border border-line bg-field px-3 text-foreground focus:border-signal focus:ring-signal/15"
                      type="date"
                      value={settings.effectiveFrom}
                      onChange={(event) => setSettings({ ...settings, effectiveFrom: event.target.value })}
                    />
                  </label>
                </div>
                <label className="mt-4 grid gap-2 text-sm font-bold text-muted">
                  Notes
                  <textarea
                    className="min-h-24 rounded-panel border border-line bg-field px-3 py-3 text-foreground focus:border-signal focus:ring-signal/15"
                    value={settings.notes ?? ''}
                    onChange={(event) => setSettings({ ...settings, notes: event.target.value })}
                  />
                </label>
              </div>

              <div className="rounded-panel border border-line bg-surface p-5 shadow-soft">
                <h2 className="text-xl font-black text-foreground">Tax percentages</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {percentFields.map(([field, label]) => (
                    <label className="grid gap-2 text-sm font-bold text-muted" key={field}>
                      {label}
                      <input
                        className="h-11 rounded-panel border border-line bg-field px-3 text-foreground focus:border-signal focus:ring-signal/15"
                        min="0"
                        step="0.001"
                        type="number"
                        value={settings[field]}
                        onChange={(event) => setNumber(field, event.target.value)}
                      />
                    </label>
                  ))}
                  <label className="grid gap-2 text-sm font-bold text-muted">
                    COM / Exm / Seal fee
                    <input
                      className="h-11 rounded-panel border border-line bg-field px-3 text-foreground focus:border-signal focus:ring-signal/15"
                      min="0"
                      step="1"
                      type="number"
                      value={settings.comExmSealLkr}
                      onChange={(event) => setNumber('comExmSealLkr', event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-panel border border-line bg-surface p-5 shadow-soft">
                <h2 className="text-xl font-black text-foreground">Luxury thresholds</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Object.entries(settings.luxuryThresholds).map(([key, value]) => (
                    <label className="grid gap-2 text-sm font-bold capitalize text-muted" key={key}>
                      {key}
                      <input
                        className="h-11 rounded-panel border border-line bg-field px-3 text-foreground focus:border-signal focus:ring-signal/15"
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

            <aside className="h-fit min-w-0 rounded-panel border border-line bg-jdm-panel p-5 text-white shadow-soft">
              <h2 className="text-xl font-black">Luxury bands</h2>
              <div className="mt-4 space-y-3">
                {settings.luxuryBands.map((band, index) => (
                  <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-2" key={index}>
                    <label className="grid min-w-0 gap-1 text-xs font-bold uppercase tracking-wide text-white/58">
                      Up to excess
                      <input
                        className="h-10 w-full min-w-0 max-w-full rounded-panel border border-white/15 bg-white/8 px-2 text-white"
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
                    <label className="grid min-w-0 gap-1 text-xs font-bold uppercase tracking-wide text-white/58">
                      Rate
                      <input
                        className="h-10 w-full min-w-0 max-w-full rounded-panel border border-white/15 bg-white/8 px-2 text-white"
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
                className="bg-brand-gradient mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel px-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
                disabled={saving || status !== 'authenticated'}
                type="submit"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save and recalculate'}
              </button>
              <button
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel border border-white/15 px-4 text-sm font-black text-white hover:border-white"
                disabled={saving || !session?.accessToken}
                onClick={async () => {
                  if (!session?.accessToken) return;
                  const result = await recalculateCars(session.accessToken);
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
