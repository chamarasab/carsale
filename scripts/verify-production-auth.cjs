const { createHash } = require('node:crypto');

const clientUrl = normalizeUrl(process.env.CLIENT_URL || 'https://jdmimporters.lk');
const apiUrl = normalizeUrl(process.env.API_URL || 'https://carsale-1.onrender.com/api');
const expectedCallbackUrl = `${clientUrl}/api/auth/callback/google`;

async function main() {
  const [readiness, authorizationUrl] = await Promise.all([
    retry('API auth readiness', getApiReadiness),
    retry('NextAuth Google authorization URL', getGoogleAuthorizationUrl),
    retry('API browser origin', verifyApiCors),
  ]);

  assert(readiness.ready === true, 'The API reports that Google authentication is not ready');
  assert(readiness.provider === 'google', 'The API readiness provider is not Google');
  assert(/^[a-f0-9]{16}$/.test(readiness.clientIdFingerprint || ''), 'The API returned an invalid OAuth fingerprint');

  const googleUrl = new URL(authorizationUrl);
  const clientId = googleUrl.searchParams.get('client_id');
  const redirectUri = googleUrl.searchParams.get('redirect_uri');
  assert(clientId, 'The Google authorization URL is missing client_id');
  assert(redirectUri === expectedCallbackUrl, `Google redirect URI must be ${expectedCallbackUrl}`);
  assert(
    readiness.clientIdFingerprint === fingerprint(clientId),
    'Vercel and Render are configured with different Google OAuth client IDs',
  );

  console.log(`Production authentication configuration and API CORS verified: ${expectedCallbackUrl}`);
  console.log('A real Google sign-in is still required to verify the registered callback and account access.');
}

async function verifyApiCors() {
  const origin = new URL(clientUrl).origin;
  const response = await fetch(`${apiUrl}/inquiries`, {
    method: 'OPTIONS',
    headers: {
      origin,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type,authorization',
    },
    signal: AbortSignal.timeout(30_000),
  });
  assert(response.ok, `API CORS preflight returned HTTP ${response.status}`);
  assert(response.headers.get('access-control-allow-origin') === origin, `API CLIENT_ORIGIN must allow ${origin}`);
  assert(response.headers.get('access-control-allow-credentials') === 'true', 'API must allow credentialed browser requests');
  const methods = (response.headers.get('access-control-allow-methods') || '').toUpperCase().split(',').map((value) => value.trim());
  const headers = (response.headers.get('access-control-allow-headers') || '').toLowerCase().split(',').map((value) => value.trim());
  assert(methods.includes('POST'), 'API CORS must allow POST requests');
  assert(headers.includes('content-type') && headers.includes('authorization'), 'API CORS must allow content-type and authorization headers');
}

async function getApiReadiness() {
  const response = await fetch(`${apiUrl}/auth/readiness`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
  return response.json();
}

async function getGoogleAuthorizationUrl() {
  const csrfResponse = await fetch(`${clientUrl}/api/auth/csrf`, { redirect: 'manual' });
  if (!csrfResponse.ok) throw new Error(`NextAuth CSRF endpoint returned HTTP ${csrfResponse.status}`);
  const csrf = await csrfResponse.json();
  assert(csrf.csrfToken, 'NextAuth CSRF endpoint did not return a token');

  const cookies = getSetCookies(csrfResponse)
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ');
  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    callbackUrl: `${clientUrl}/users/vehicles`,
    json: 'true',
  });
  const response = await fetch(`${clientUrl}/api/auth/signin/google`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookies,
    },
    body,
  });
  if (!response.ok) throw new Error(`NextAuth Google sign-in endpoint returned HTTP ${response.status}`);
  const result = await response.json();
  assert(result.url, 'NextAuth did not return a Google authorization URL');
  return result.url;
}

function getSetCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const value = response.headers.get('set-cookie');
  return value ? [value] : [];
}

async function retry(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
  throw new Error(`${label} did not become ready: ${lastError instanceof Error ? lastError.message : 'unknown error'}`);
}

function fingerprint(value) {
  return createHash('sha256').update(value.trim()).digest('hex').slice(0, 16);
}

function normalizeUrl(value) {
  return value.replace(/\/$/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Production authentication verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { verifyApiCors };
