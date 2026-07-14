import assert from 'node:assert/strict';
import test from 'node:test';
import { googleClientIdFingerprint, validateEnvironment } from './environment';

const validEnvironment = {
  MONGODB_URI: 'mongodb://localhost:27017/carsale',
  CLIENT_ORIGIN: 'https://carsale-client.vercel.app',
  AUTH_JWT_SECRET: 'a-secure-test-secret-that-is-longer-than-32-characters',
  GOOGLE_CLIENT_ID: '123456789-example_client.apps.googleusercontent.com',
};

test('validates and normalizes required authentication environment variables', () => {
  const result = validateEnvironment({
    ...validEnvironment,
    CLIENT_ORIGIN: `  ${validEnvironment.CLIENT_ORIGIN}  `,
  });

  assert.equal(result.CLIENT_ORIGIN, validEnvironment.CLIENT_ORIGIN);
  assert.equal(result.GOOGLE_CLIENT_ID, validEnvironment.GOOGLE_CLIENT_ID);
});

test('preserves support for multiple allowed client origins', () => {
  const result = validateEnvironment({
    ...validEnvironment,
    CLIENT_ORIGIN: 'https://carsale-client.vercel.app, https://carsale-preview.vercel.app',
  });

  assert.equal(
    result.CLIENT_ORIGIN,
    'https://carsale-client.vercel.app,https://carsale-preview.vercel.app',
  );
});

test('rejects a missing Google OAuth client ID at startup', () => {
  assert.throws(
    () => validateEnvironment({ ...validEnvironment, GOOGLE_CLIENT_ID: '' }),
    /Missing required environment variable: GOOGLE_CLIENT_ID/,
  );
});

test('rejects malformed or placeholder Google OAuth client IDs', () => {
  assert.throws(
    () => validateEnvironment({ ...validEnvironment, GOOGLE_CLIENT_ID: 'your-google-oauth-client-id.apps.googleusercontent.com' }),
    /placeholder value/,
  );
  assert.throws(
    () => validateEnvironment({ ...validEnvironment, GOOGLE_CLIENT_ID: 'not-a-google-client-id' }),
    /not a valid Google OAuth web client ID/,
  );
});

test('requires production JWT secrets to be at least 32 characters', () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        AUTH_JWT_SECRET: 'sixteen-characters',
      }),
    /at least 32 characters/,
  );
});

test('generates stable, non-reversible client ID fingerprints', () => {
  const fingerprint = googleClientIdFingerprint(validEnvironment.GOOGLE_CLIENT_ID);
  assert.match(fingerprint, /^[a-f0-9]{16}$/);
  assert.equal(fingerprint, googleClientIdFingerprint(` ${validEnvironment.GOOGLE_CLIENT_ID} `));
  assert.notEqual(fingerprint, googleClientIdFingerprint('999999999-another.apps.googleusercontent.com'));
});
