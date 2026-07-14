import { createHash } from 'node:crypto';

const GOOGLE_CLIENT_ID_PATTERN = /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;

export function validateEnvironment(config: Record<string, unknown>) {
  const validated = { ...config };

  validated.MONGODB_URI = requireValue(config, 'MONGODB_URI');
  validated.CLIENT_ORIGIN = validateOrigins(requireValue(config, 'CLIENT_ORIGIN'));
  validated.AUTH_JWT_SECRET = requireSecret(config, 'AUTH_JWT_SECRET');
  validated.GOOGLE_CLIENT_ID = validateGoogleClientId(requireValue(config, 'GOOGLE_CLIENT_ID'));

  return validated;
}

export function googleClientIdFingerprint(clientId: string) {
  return createHash('sha256').update(clientId.trim()).digest('hex').slice(0, 16);
}

function requireValue(config: Record<string, unknown>, key: string) {
  const value = typeof config[key] === 'string' ? config[key].trim() : '';
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  if (/^(change|generate|your)-/i.test(value)) {
    throw new Error(`Environment variable ${key} still contains a placeholder value`);
  }
  return value;
}

function requireSecret(config: Record<string, unknown>, key: string) {
  const value = requireValue(config, key);
  const minimumLength = config.NODE_ENV === 'production' ? 32 : 16;
  if (value.length < minimumLength) {
    throw new Error(`Environment variable ${key} must be at least ${minimumLength} characters`);
  }
  return value;
}

function validateUrl(value: string, key: string) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return value;
  } catch {
    throw new Error(`Environment variable ${key} must be an absolute HTTP(S) URL`);
  }
}

function validateOrigins(value: string) {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length) throw new Error('CLIENT_ORIGIN must include at least one origin');
  return origins.map((origin) => validateUrl(origin, 'CLIENT_ORIGIN')).join(',');
}

function validateGoogleClientId(value: string) {
  if (!GOOGLE_CLIENT_ID_PATTERN.test(value)) {
    throw new Error('GOOGLE_CLIENT_ID is not a valid Google OAuth web client ID');
  }
  return value;
}
