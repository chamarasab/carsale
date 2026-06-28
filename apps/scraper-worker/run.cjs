const dotenv = require('dotenv');
const { resolve } = require('node:path');

dotenv.config({ path: resolve(__dirname, '../api/.env') });

const apiUrl = (process.env.SCRAPER_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const serviceKey = process.env.SCRAPER_SERVICE_KEY;
const pollIntervalMs = envNumber('SCRAPER_POLL_INTERVAL_MS', 5_000);
const timeoutMs = envNumber('SCRAPER_RUN_TIMEOUT_MS', 30 * 60 * 1000);

async function main() {
  if (!serviceKey) throw new Error('SCRAPER_SERVICE_KEY is required');

  const startedAt = Date.now();
  const start = await request('/scraper/internal/run', { method: 'POST' });
  const runId = start.runId ? String(start.runId) : null;
  console.log(`[SCRAPER WORKER] ${start.started ? 'Started' : 'Joined'} run ${runId || 'currently active'}`);

  let lastProgress = '';
  while (Date.now() - startedAt < timeoutMs) {
    const status = await request('/scraper/internal/status');
    const latest = status.lastRun;
    if (latest) {
      const progress = [
        latest.status,
        latest.jobs?.length || 0,
        latest.fetched || 0,
        latest.inserted || 0,
        latest.updated || 0,
      ].join(':');
      if (progress !== lastProgress) {
        console.log(
          `[SCRAPER STATUS] status=${latest.status} jobs=${latest.jobs?.length || 0} fetched=${latest.fetched || 0} inserted=${latest.inserted || 0} updated=${latest.updated || 0}`,
        );
        lastProgress = progress;
      }
    }

    const isTargetRun = !runId || String(latest?._id) === runId;
    if (!status.running && latest && isTargetRun && latest.status !== 'running') {
      console.log(JSON.stringify(latest, null, 2));
      if (latest.status === 'failed' || latest.status === 'interrupted') process.exitCode = 1;
      return;
    }
    await delay(pollIntervalMs);
  }

  throw new Error(`Scrape run did not finish within ${Math.round(timeoutMs / 60000)} minutes`);
}

async function request(path, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      'x-scraper-service-key': serviceKey,
    },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Scraper API returned HTTP ${response.status}`);
  }
  return body;
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

main().catch((error) => {
  console.error(`[SCRAPER WORKER FAILED] ${error.message}`);
  process.exitCode = 1;
});
