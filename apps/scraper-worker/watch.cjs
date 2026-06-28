const dotenv = require('dotenv');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

dotenv.config({ path: resolve(__dirname, '../api/.env') });

if (process.env.SCRAPER_BOT_ENABLED === 'false') {
  console.log('[SCRAPER SCHEDULER] Disabled by SCRAPER_BOT_ENABLED=false');
  process.exit(0);
}

const initialDelayMs = envNumber('SCRAPER_INITIAL_DELAY_MS', 60_000);
const intervalMs = envNumber('SCRAPER_INTERVAL_MS', 6 * 60 * 60 * 1000);
let stopping = false;
let timer;

console.log(
  `[SCRAPER SCHEDULER] Enabled. First run in ${Math.round(initialDelayMs / 1000)}s; interval ${Math.round(intervalMs / 60000)}m`,
);
schedule(initialDelayMs);

function schedule(delayMs) {
  if (stopping) return;
  console.log(`[SCRAPER NEXT RUN] ${new Date(Date.now() + delayMs).toISOString()}`);
  timer = setTimeout(async () => {
    await runOnce();
    schedule(intervalMs);
  }, delayMs);
}

function runOnce() {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [resolve(__dirname, 'run.cjs')], {
      env: process.env,
      stdio: 'inherit',
    });
    child.once('exit', (code, signal) => {
      console.log(`[SCRAPER SCHEDULER] Run finished code=${code ?? 'none'} signal=${signal ?? 'none'}`);
      resolveRun();
    });
  });
}

function stop() {
  stopping = true;
  if (timer) clearTimeout(timer);
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
