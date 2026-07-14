import 'server-only';
import { createHash } from 'node:crypto';

const GOOGLE_CLIENT_ID_PATTERN = /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;

export const serverEnvironment = {
  apiUrl: readUrl('NEXT_PUBLIC_API_URL', 'http://localhost:4000/api'),
  siteUrl: readUrl('NEXTAUTH_URL', 'http://localhost:3000'),
  nextAuthSecret: readSecret('NEXTAUTH_SECRET'),
  googleClientId: readGoogleClientId(),
  googleClientSecret: readSecret('GOOGLE_CLIENT_SECRET'),
};

export function googleClientIdFingerprint(clientId: string) {
  return createHash('sha256').update(clientId.trim()).digest('hex').slice(0, 16);
}

function readGoogleClientId() {
  const value = readRequired('GOOGLE_CLIENT_ID');
  if (!GOOGLE_CLIENT_ID_PATTERN.test(value)) {
    throw new Error('[auth-config] GOOGLE_CLIENT_ID is not a valid Google OAuth web client ID');
  }
  return value;
}

function readSecret(key: string) {
  const value = readRequired(key);
  if (value.length < 24) throw new Error(`[auth-config] ${key} must be at least 24 characters`);
  return value;
}

function readUrl(key: string, developmentFallback: string) {
  const value = process.env[key]?.trim() || (process.env.NODE_ENV === 'production' ? '' : developmentFallback);
  if (!value) throw new Error(`[auth-config] Missing required environment variable: ${key}`);

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return value.replace(/\/$/, '');
  } catch {
    throw new Error(`[auth-config] ${key} must be an absolute HTTP(S) URL`);
  }
}

function readRequired(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`[auth-config] Missing required environment variable: ${key}`);
  if (/^(change|generate|your)-/i.test(value)) {
    throw new Error(`[auth-config] ${key} still contains a placeholder value`);
  }
  return value;
}
