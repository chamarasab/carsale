'use client';

import {
  AlertTriangle,
  ExternalLink,
  EyeOff,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import {
  createWebsiteValue,
  deleteWebsiteValue,
  getMissingWebsiteValues,
  getWebsiteValues,
  ignoreMissingWebsiteValue,
  recalculateCars,
  refreshWebsiteValues,
  updateWebsiteValue,
  WebsiteValue,
  WebsiteValueInput,
  WebsiteValueMiss,
} from '@/lib/admin-api';

const emptyValue: WebsiteValueInput = {
  no: 1,
  key: '',
  maker: '',
  model: '',
  vehicleModel: '',
  vehicleGrade: '',
  aliases: [],
  drivetrain: '2WD',
  modelCodes: [],
  price: 0,
  currency: 'JPY',
  taxIncluded: true,
  consumptionTaxRate: 0.1,
  customsDepreciationRate: 0.85,
  sourceUrl: '',
  sourceDataUrl: '',
  effectiveFrom: '',
  active: true,
};

export default function WebsiteValuesPage() {
  const { data: session, status } = useSession();
  const [values, setValues] = useState<WebsiteValue[]>([]);
  const [missingValues, setMissingValues] = useState<WebsiteValueMiss[]>([]);
  const [form, setForm] = useState<WebsiteValueInput>(emptyValue);
  const [editingId, setEditingId] = useState<string>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = session?.user.role === 'ADMIN';

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    const [storedValues, missing] = await Promise.all([
      getWebsiteValues(session.accessToken),
      getMissingWebsiteValues(session.accessToken),
    ]);
    setValues(storedValues);
    setMissingValues(missing);
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isAdmin) return;
    load().catch(() =>
      setMessage('Could not load manufacturer website values.'),
    );
  }, [isAdmin, load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) return;
    setBusy(true);
    setMessage('');
    try {
      if (editingId)
        await updateWebsiteValue(editingId, form, session.accessToken);
      else await createWebsiteValue(form, session.accessToken);
      const recalculated = await recalculateCars(session.accessToken);
      await load();
      resetForm();
      setMessage(
        `Saved and recalculated ${recalculated.recalculated} advertisements.`,
      );
    } catch {
      setMessage(
        'Could not save this manufacturer price. Check the number, key, and source URL.',
      );
    } finally {
      setBusy(false);
    }
  }

  function edit(value: WebsiteValue) {
    const { _id, lastSyncedAt: _lastSyncedAt, ...input } = value;
    setEditingId(_id);
    setForm(input);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(undefined);
    setForm({
      ...emptyValue,
      no: Math.max(form.no, ...values.map((value) => value.no)) + 1,
    });
  }

  return (
    <main>
      <Nav />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-wide text-signal">
            Admin
          </p>
          <h1 className="mt-2 text-4xl font-black text-foreground">
            Manufacturer website prices
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Official model, grade, and drivetrain prices used to derive the
            customs website-value CIF.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {status !== 'authenticated' || !isAdmin ? (
          <div className="border border-line bg-surface p-6">
            <h2 className="text-xl font-black text-foreground">
              Administrator access required
            </h2>
            <Link
              className="bg-brand-gradient mt-4 inline-flex rounded-panel px-4 py-3 text-sm font-black text-white"
              href="/login"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <div className="grid min-w-0 gap-8 xl:grid-cols-[390px_minmax(0,1fr)]">
            <form
              className="h-fit border border-line bg-surface p-5 shadow-soft"
              onSubmit={submit}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-foreground">
                  {editingId ? 'Edit price' : 'Add price'}
                </h2>
                {editingId ? (
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-panel border border-line text-muted"
                    onClick={resetForm}
                    title="Cancel editing"
                    type="button"
                  >
                    <X size={17} />
                  </button>
                ) : null}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <Field label="Number">
                  <input
                    {...numberProps(form.no, (value) =>
                      setForm({ ...form, no: value }),
                    )}
                    min={1}
                  />
                </Field>
                <Field label="Unique key">
                  <input
                    {...textProps(form.key, (value) =>
                      setForm({ ...form, key: value }),
                    )}
                    placeholder="toyota-roomy-m900a-gbve"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Maker">
                    <input
                      {...textProps(form.maker, (value) =>
                        setForm({ ...form, maker: value }),
                      )}
                    />
                  </Field>
                  <Field label="Model">
                    <input
                      {...textProps(form.model, (value) =>
                        setForm({ ...form, model: value }),
                      )}
                    />
                  </Field>
                </div>
                <Field label="Vehicle model">
                  <input
                    {...textProps(form.vehicleModel, (value) =>
                      setForm({ ...form, vehicleModel: value }),
                    )}
                    placeholder="Toyota Roomy Custom G 2WD"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Grade">
                    <input
                      {...textProps(form.vehicleGrade, (value) =>
                        setForm({ ...form, vehicleGrade: value }),
                      )}
                    />
                  </Field>
                  <Field label="Drivetrain">
                    <select
                      className={inputClass}
                      value={form.drivetrain}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          drivetrain: event.target.value as '2WD' | '4WD',
                        })
                      }
                    >
                      <option>2WD</option>
                      <option>4WD</option>
                    </select>
                  </Field>
                </div>
                <Field label="Grade aliases">
                  <input
                    {...textProps(form.aliases.join(', '), (value) =>
                      setForm({ ...form, aliases: csv(value) }),
                    )}
                    placeholder="Custom G, Custom-G"
                  />
                </Field>
                <Field label="Model codes">
                  <input
                    {...textProps(form.modelCodes.join(', '), (value) =>
                      setForm({ ...form, modelCodes: csv(value) }),
                    )}
                    placeholder="M900A-GBVE"
                  />
                </Field>
                <Field label="Official price (JPY)">
                  <input
                    {...numberProps(form.price, (value) =>
                      setForm({ ...form, price: value }),
                    )}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Japan tax rate">
                    <input
                      {...decimalProps(form.consumptionTaxRate, (value) =>
                        setForm({ ...form, consumptionTaxRate: value }),
                      )}
                    />
                  </Field>
                  <Field label="Depreciation">
                    <input
                      {...decimalProps(form.customsDepreciationRate, (value) =>
                        setForm({ ...form, customsDepreciationRate: value }),
                      )}
                    />
                  </Field>
                </div>
                <Field label="Official source URL">
                  <input
                    {...textProps(form.sourceUrl, (value) =>
                      setForm({ ...form, sourceUrl: value }),
                    )}
                    type="url"
                  />
                </Field>
                <Field label="Source data URL">
                  <input
                    {...textProps(form.sourceDataUrl ?? '', (value) =>
                      setForm({ ...form, sourceDataUrl: value }),
                    )}
                    required={false}
                    type="url"
                  />
                </Field>
                <Field label="Effective from">
                  <input
                    {...textProps(form.effectiveFrom ?? '', (value) =>
                      setForm({ ...form, effectiveFrom: value }),
                    )}
                    required={false}
                    type="date"
                  />
                </Field>
                <div className="flex flex-wrap gap-5 text-sm font-bold text-muted">
                  <Check
                    label="Tax included"
                    checked={form.taxIncluded}
                    onChange={(checked) =>
                      setForm({ ...form, taxIncluded: checked })
                    }
                  />
                  <Check
                    label="Active"
                    checked={form.active}
                    onChange={(checked) =>
                      setForm({ ...form, active: checked })
                    }
                  />
                </div>
              </div>
              <button
                className="bg-brand-gradient mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel px-4 text-sm font-black text-white disabled:opacity-50"
                disabled={busy}
                type="submit"
              >
                {editingId ? <Save size={17} /> : <Plus size={17} />}
                {busy ? 'Saving...' : editingId ? 'Save price' : 'Add price'}
              </button>
            </form>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-foreground">
                    Stored values
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    MongoDB collection: websitevalues
                  </p>
                </div>
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-panel border border-line bg-surface px-4 text-sm font-black text-foreground disabled:opacity-50"
                  disabled={busy}
                  onClick={async () => {
                    if (!session.accessToken) return;
                    setBusy(true);
                    try {
                      const result = await refreshWebsiteValues(
                        session.accessToken,
                      );
                      const recalculated = await recalculateCars(
                        session.accessToken,
                      );
                      await load();
                      setMessage(
                        `Synced ${result.updated} official prices from ${result.sources.length - result.failed} sources${result.failed ? `; ${result.failed} source${result.failed === 1 ? '' : 's'} kept cached values` : ''}. Recalculated ${recalculated.recalculated} advertisements.`,
                      );
                    } catch {
                      setMessage(
                        'Could not refresh the official manufacturer feed. Cached values are unchanged.',
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  type="button"
                >
                  <RefreshCcw size={17} /> Sync official prices
                </button>
              </div>
              {message ? (
                <p className="mt-4 border-l-4 border-signal bg-field p-3 text-sm font-bold text-sub">
                  {message}
                </p>
              ) : null}
              {missingValues.length ? (
                <section className="mt-5 overflow-hidden border border-amber-500/45 bg-surface">
                  <div className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 p-4">
                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={19} />
                    <div>
                      <h3 className="font-black text-foreground">
                        Website value not found ({missingValues.length})
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        No exact official grade and drivetrain matched these auction identities. Their website-value tax basis remains unset.
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="border-b border-line bg-field text-xs uppercase text-muted">
                        <tr>
                          <th className="px-4 py-3">Vehicle</th>
                          <th className="px-4 py-3">Identity</th>
                          <th className="px-4 py-3">Seen</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {missingValues.map((missing) => (
                          <tr key={missing._id}>
                            <td className="px-4 py-3">
                              <p className="font-black text-foreground">
                                {missing.maker} {missing.model}
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                {missing.vehicleGrade || 'Grade not provided'}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-mono text-xs text-sub">
                                {[missing.modelCode, missing.chassisCode].filter(Boolean).join(' · ') || 'No model code'}
                              </p>
                              {missing.sourceUrl ? (
                                <a
                                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-signal"
                                  href={missing.sourceUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {missing.source || 'Auction source'} <ExternalLink size={12} />
                                </a>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted">
                              <p>{new Date(missing.lastSeenAt).toLocaleString()}</p>
                              <p className="mt-1">{missing.occurrences} checks</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-panel border border-line text-muted hover:text-foreground"
                                onClick={async () => {
                                  if (!session.accessToken) return;
                                  setBusy(true);
                                  try {
                                    await ignoreMissingWebsiteValue(missing._id, session.accessToken);
                                    await load();
                                  } catch {
                                    setMessage('Could not dismiss this missing value alert.');
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                                title="Dismiss alert"
                                type="button"
                              >
                                <EyeOff size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}
              <div className="mt-5 overflow-x-auto border border-line bg-surface shadow-soft">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-line bg-field text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-3">No.</th>
                      <th className="px-4 py-3">Vehicle</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {values.map((value) => (
                      <tr
                        className={value.active ? '' : 'opacity-50'}
                        key={value._id}
                      >
                        <td className="px-4 py-3 font-black text-muted">
                          {value.no}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-black text-foreground">
                            {value.vehicleModel}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {value.vehicleGrade} · {value.drivetrain}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-sub">
                          {value.modelCodes.join(', ')}
                        </td>
                        <td className="px-4 py-3 font-black text-foreground">
                          JPY {value.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            className="inline-flex items-center gap-1 font-bold text-signal"
                            href={value.sourceUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Official <ExternalLink size={13} />
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-panel border border-line text-muted hover:text-foreground"
                              onClick={() => edit(value)}
                              title="Edit price"
                              type="button"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-panel border border-line text-muted hover:text-red-500"
                              onClick={async () => {
                                if (
                                  !session.accessToken ||
                                  !window.confirm(
                                    `Remove ${value.vehicleModel}?`,
                                  )
                                )
                                  return;
                                setBusy(true);
                                try {
                                  const removal = await deleteWebsiteValue(
                                    value._id,
                                    session.accessToken,
                                  );
                                  const result = await recalculateCars(
                                    session.accessToken,
                                  );
                                  await load();
                                  setMessage(
                                    `${removal.deactivated ? 'Deactivated' : 'Deleted'} and recalculated ${result.recalculated} advertisements.`,
                                  );
                                } catch {
                                  setMessage(
                                    'Could not remove this manufacturer price.',
                                  );
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              title="Remove price"
                              type="button"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const inputClass =
  'h-11 w-full rounded-panel border border-line bg-field px-3 text-foreground focus:border-signal focus:ring-signal/15';
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-muted">
      {label}
      {children}
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}
function textProps(value: string, onChange: (value: string) => void) {
  return {
    className: inputClass,
    required: true,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange(event.target.value),
  };
}
function numberProps(value: number, onChange: (value: number) => void) {
  return {
    ...textProps(String(value), (next) => onChange(Number(next))),
    min: 0,
    step: 1,
    type: 'number',
  };
}
function decimalProps(value: number, onChange: (value: number) => void) {
  return { ...numberProps(value, onChange), step: 0.01 };
}
function csv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
