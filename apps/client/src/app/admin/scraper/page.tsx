'use client';

import { AlertTriangle, DatabaseZap, Play, RefreshCcw, Search } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import {
  getScraperStatus,
  runAutomarketScraper,
  runScraper,
  ScrapeRun,
  ScraperStatus,
} from '@/lib/admin-api';
import { AUCTION_GRADES } from '@/lib/auction-grades';

const inputClass =
  'mt-2 h-11 w-full rounded-panel border border-line bg-field px-3 text-sm font-bold text-foreground outline-none focus:border-signal';

type AutomarketForm = {
  maker: string;
  model: string;
  auctionGrade: string;
  yearFrom: number;
  yearTo: number;
  listSize: number | 'all';
};

export default function AdminScraperPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [scraper, setScraper] = useState<ScraperStatus | null>(null);
  const [message, setMessage] = useState('');
  const [starting, setStarting] = useState(false);
  const [automarketRunning, setAutomarketRunning] = useState(false);
  const [automarketForm, setAutomarketForm] = useState<AutomarketForm>({
    maker: 'Toyota',
    model: 'Roomy',
    auctionGrade: '',
    yearFrom: 2023,
    yearTo: new Date().getFullYear(),
    listSize: 5,
  });
  const isAdmin = session?.user.role === 'ADMIN';

  const refresh = useCallback(async () => {
    if (!session?.accessToken || !isAdmin) return;
    try {
      setScraper(await getScraperStatus(session.accessToken));
    } catch {
      setMessage('Could not load scraper status.');
    }
  }, [isAdmin, session?.accessToken]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), scraper?.running ? 2_000 : 10_000);
    return () => window.clearInterval(timer);
  }, [refresh, scraper?.running]);

  async function runNow() {
    if (!session?.accessToken) return;
    setStarting(true);
    setMessage('');
    try {
      const result = await runScraper(session.accessToken);
      setMessage(result.started ? 'JP Center scrape started.' : result.reason || 'A scrape is already running.');
      await refresh();
    } catch {
      setMessage('Could not start the JP Center scraper.');
    } finally {
      setStarting(false);
    }
  }

  async function runAutomarket() {
    if (!session?.accessToken) return;
    setAutomarketRunning(true);
    setMessage('');
    try {
      const selectedLimit = automarketForm.listSize;
      const allUpcoming = selectedLimit === 'all';
      const result = await runAutomarketScraper({
        ...automarketForm,
        listSize: typeof selectedLimit === 'number' ? selectedLimit : undefined,
        allUpcoming,
      }, session.accessToken);
      setMessage(result.started
        ? 'Automarket import started. Live progress is shown below.'
        : result.reason || 'A scrape is already running.');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not run the Automarket scraper.');
    } finally {
      setAutomarketRunning(false);
    }
  }

  const lastJpCenterRun = scraper?.lastRuns?.jpCenter
    ?? scraper?.runs.find((run) => run.source === 'JP Center')
    ?? null;
  const lastAutomarketRun = scraper?.lastRuns?.automarket
    ?? scraper?.runs.find((run) => run.source === 'A-Automarket')
    ?? null;
  const automarketActive = lastAutomarketRun?.status === 'running';

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link className="text-sm font-black text-sub hover:text-signal" href="/admin">
          Back to admin panel
        </Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-signal">Import service</p>
            <h1 className="mt-2 text-4xl font-black text-foreground">Auction scrapers</h1>
            <p className="mt-2 text-sm font-bold text-muted">
              {scraper?.schedule ?? 'Loading schedule'} · {scraper?.running ? 'Running now' : 'Waiting'}
            </p>
          </div>
          {isAdmin ? (
            <div className="flex gap-2">
              <button
                aria-label="Refresh scraper status"
                className="grid h-11 w-11 place-items-center rounded-panel border border-line bg-surface text-muted hover:border-signal hover:text-foreground"
                onClick={() => void refresh()}
                title="Refresh status"
                type="button"
              >
                <RefreshCcw size={18} />
              </button>
              <button
                className="bg-brand-gradient inline-flex h-11 items-center justify-center gap-2 rounded-panel px-5 text-sm font-black text-white disabled:opacity-50"
                disabled={starting || scraper?.running}
                onClick={runNow}
                type="button"
              >
                <Play size={17} />
                {starting ? 'Starting...' : scraper?.running ? 'Running...' : 'Run now'}
              </button>
            </div>
          ) : null}
        </div>

        {isAdmin && (scraper?.missingWebsiteValues ?? 0) > 0 ? (
          <Link
            className="mt-6 flex items-start gap-3 border border-amber-500/45 bg-amber-500/10 p-4 text-sm"
            href="/admin/website-values"
          >
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={19} />
            <span>
              <strong className="block text-foreground">
                Website value not found for {scraper?.missingWebsiteValues} auction variant{scraper?.missingWebsiteValues === 1 ? '' : 's'}
              </strong>
              <span className="mt-1 block font-bold text-muted">
                Review unmatched model codes before relying on their estimated tax totals.
              </span>
            </span>
          </Link>
        ) : null}

        {!isAdmin ? (
          <section className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-soft">
            <p className="font-bold text-foreground">
              {sessionStatus === 'loading' ? 'Checking access...' : 'Only administrators can operate the scraper.'}
            </p>
          </section>
        ) : (
          <>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <RunSummary icon={<DatabaseZap size={22} />} run={lastJpCenterRun} source="JP Center" />
              <RunSummary icon={<Search size={22} />} run={lastAutomarketRun} source="A-Automarket" />
            </div>

            <section className="mt-6 rounded-panel border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <Search className="text-signal" size={22} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-muted">Manual source</p>
                  <h2 className="text-xl font-black text-foreground">A-Automarket import</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <label className="text-xs font-black uppercase text-muted">
                  Maker
                  <select
                    className={inputClass}
                    onChange={(event) => setAutomarketForm((current) => ({ ...current, maker: event.target.value }))}
                    value={automarketForm.maker}
                  >
                    {['Toyota', 'Daihatsu', 'Honda', 'Suzuki', 'Nissan', 'Mazda', 'Mitsubishi', 'Subaru', 'Lexus'].map(
                      (maker) => <option key={maker}>{maker}</option>,
                    )}
                  </select>
                </label>
                <label className="text-xs font-black uppercase text-muted">
                  Model
                  <input
                    className={inputClass}
                    onChange={(event) => setAutomarketForm((current) => ({ ...current, model: event.target.value }))}
                    placeholder="Roomy"
                    value={automarketForm.model}
                  />
                </label>
                <label className="text-xs font-black uppercase text-muted">
                  Auction grade
                  <select
                    className={inputClass}
                    onChange={(event) =>
                      setAutomarketForm((current) => ({ ...current, auctionGrade: event.target.value }))
                    }
                    value={automarketForm.auctionGrade}
                  >
                    <option value="">Any valid grade</option>
                    {AUCTION_GRADES.map((grade) => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-black uppercase text-muted">
                  From year
                  <input
                    className={inputClass}
                    max={new Date().getFullYear()}
                    min={1980}
                    onChange={(event) =>
                      setAutomarketForm((current) => ({ ...current, yearFrom: Number(event.target.value) }))
                    }
                    type="number"
                    value={automarketForm.yearFrom}
                  />
                </label>
                <label className="text-xs font-black uppercase text-muted">
                  To year
                  <input
                    className={inputClass}
                    max={new Date().getFullYear()}
                    min={1980}
                    onChange={(event) =>
                      setAutomarketForm((current) => ({ ...current, yearTo: Number(event.target.value) }))
                    }
                    type="number"
                    value={automarketForm.yearTo}
                  />
                </label>
                <label className="text-xs font-black uppercase text-muted">
                  Import limit
                  <select
                    className={inputClass}
                    onChange={(event) => setAutomarketForm((current) => ({
                      ...current,
                      listSize: event.target.value === 'all' ? 'all' : Number(event.target.value),
                    }))}
                    value={automarketForm.listSize}
                  >
                    {[1, 3, 5, 10].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
                    <option value="all">All upcoming</option>
                  </select>
                </label>
              </div>
              <button
                className="bg-brand-gradient mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-panel px-5 text-sm font-black text-white disabled:opacity-50"
                disabled={automarketRunning || automarketActive || scraper?.running || !automarketForm.model.trim()}
                onClick={runAutomarket}
                type="button"
              >
                <Play size={17} />
                {automarketRunning ? 'Starting...' : automarketActive ? 'Importing...' : 'Run Automarket import'}
              </button>
            </section>

            <section
              className="mt-6 scroll-mt-24 overflow-hidden rounded-panel border border-line bg-surface shadow-soft"
              id="configured-searches"
            >
              <div className="border-b border-line p-5">
                <h2 className="text-xl font-black text-foreground">Configured searches</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-field text-xs font-black uppercase text-muted">
                    <tr>
                      <th className="px-5 py-3">Maker</th>
                      <th className="px-5 py-3">Model</th>
                      <th className="px-5 py-3">Years</th>
                      <th className="px-5 py-3">Pages</th>
                      <th className="px-5 py-3">Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {scraper?.configuredJobs.map((job) => (
                      <tr key={`${job.maker}-${job.model}`}>
                        <td className="px-5 py-3 font-black text-foreground">{job.maker}</td>
                        <td className="px-5 py-3 font-bold text-sub">{job.model}</td>
                        <td className="px-5 py-3 text-muted">{job.yearFrom ?? 'Any'}–{job.yearTo ?? 'Now'}</td>
                        <td className="px-5 py-3 text-muted">{job.pages ?? 1}</td>
                        <td className="px-5 py-3 text-muted">{job.listSize ?? 20}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section
              className="mt-6 scroll-mt-24 overflow-hidden rounded-panel border border-line bg-surface shadow-soft"
              id="recent-runs"
            >
              <div className="border-b border-line p-5">
                <h2 className="text-xl font-black text-foreground">Recent runs</h2>
              </div>
              <div className="divide-y divide-line">
                {scraper?.runs.map((run) => (
                  <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_repeat(4,90px)] sm:items-center" key={run._id}>
                    <div>
                      <p className="font-black capitalize text-foreground">
                        {run.source} · {run.status} · {run.trigger}
                      </p>
                      <p className="mt-1 text-xs font-bold text-muted">{new Date(run.startedAt).toLocaleString()}</p>
                    </div>
                    <RunValue label="Fetched" value={run.fetched} />
                    <RunValue label="Inserted" value={run.inserted} />
                    <RunValue label="Updated" value={run.updated} />
                    <RunValue label="Errors" value={run.errors.length} />
                  </div>
                ))}
                {!scraper?.runs.length ? <p className="p-5 text-sm font-bold text-muted">No scraper runs yet.</p> : null}
              </div>
            </section>
          </>
        )}
        {message ? <p className="mt-4 text-sm font-bold text-sub">{message}</p> : null}
      </section>
    </main>
  );
}

function RunValue({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      <p className="mt-1 font-black text-foreground">{value}</p>
    </div>
  );
}

function RunSummary({ icon, run, source }: { icon: ReactNode; run: ScrapeRun | null; source: string }) {
  return (
    <section className="rounded-panel border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="text-signal">{icon}</span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-muted">Latest {source} run</p>
          <h2 className="text-xl font-black capitalize text-foreground">
            {run ? [run.status, run.trigger, run.phase].filter(Boolean).join(' · ') : 'No runs recorded'}
          </h2>
          {run ? <p className="mt-1 text-xs font-bold text-muted">{new Date(run.startedAt).toLocaleString()}</p> : null}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-line sm:grid-cols-3 xl:grid-cols-6">
        {[
          ['Fetched', run?.fetched ?? 0],
          ['Eligible', run?.eligible ?? 0],
          ['Imported', run?.imported ?? 0],
          ['Inserted', run?.inserted ?? 0],
          ['Updated', run?.updated ?? 0],
          ['Skipped / failed', run?.failedJobs ?? 0],
        ].map(([label, value]) => (
          <div className="bg-field p-4" key={label}>
            <p className="text-xs font-black uppercase text-muted">{label}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>
      {run?.errors.length ? (
        <div className="mt-4 border-l-4 border-red-500 bg-red-500/8 p-4 text-sm font-bold text-red-500">
          {run.errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      ) : null}
    </section>
  );
}
