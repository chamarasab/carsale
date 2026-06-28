'use client';

import { DatabaseZap, Play, RefreshCcw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { getScraperStatus, runScraper, ScraperStatus } from '@/lib/admin-api';

export default function AdminScraperPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [scraper, setScraper] = useState<ScraperStatus | null>(null);
  const [message, setMessage] = useState('');
  const [starting, setStarting] = useState(false);
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

  const lastRun = scraper?.lastRun;

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
            <h1 className="mt-2 text-4xl font-black text-foreground">JP Center scraper</h1>
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

        {!isAdmin ? (
          <section className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-soft">
            <p className="font-bold text-foreground">
              {sessionStatus === 'loading' ? 'Checking access...' : 'Only administrators can operate the scraper.'}
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-panel border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <DatabaseZap className="text-signal" size={22} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-muted">Latest run</p>
                  <h2 className="text-xl font-black text-foreground">
                    {lastRun ? `${lastRun.status} · ${lastRun.trigger}` : 'No runs recorded'}
                  </h2>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-line sm:grid-cols-4">
                {[
                  ['Fetched', lastRun?.fetched ?? 0],
                  ['Inserted', lastRun?.inserted ?? 0],
                  ['Updated', lastRun?.updated ?? 0],
                  ['Failed jobs', lastRun?.failedJobs ?? 0],
                ].map(([label, value]) => (
                  <div className="bg-field p-4" key={label}>
                    <p className="text-xs font-black uppercase text-muted">{label}</p>
                    <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              {lastRun?.errors.length ? (
                <div className="mt-4 border-l-4 border-red-500 bg-red-500/8 p-4 text-sm font-bold text-red-500">
                  {lastRun.errors.map((error) => <p key={error}>{error}</p>)}
                </div>
              ) : null}
            </section>

            <section className="mt-6 overflow-hidden rounded-panel border border-line bg-surface shadow-soft">
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

            <section className="mt-6 overflow-hidden rounded-panel border border-line bg-surface shadow-soft">
              <div className="border-b border-line p-5">
                <h2 className="text-xl font-black text-foreground">Recent runs</h2>
              </div>
              <div className="divide-y divide-line">
                {scraper?.runs.map((run) => (
                  <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_repeat(4,90px)] sm:items-center" key={run._id}>
                    <div>
                      <p className="font-black capitalize text-foreground">{run.status} · {run.trigger}</p>
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
