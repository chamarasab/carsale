const assert = require('node:assert/strict');
const { test } = require('node:test');
const { verifyApiCors } = require('./verify-production-auth.cjs');

test('deployment smoke test validates browser API access without submitting an inquiry', async (t) => {
  const origin = new URL(process.env.CLIENT_URL || 'https://carsale-client.vercel.app').origin;
  const validHeaders = {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
  const cases = [
    { name: 'accepts the exact origin and required request options' },
    { name: 'rejects an unconfigured origin', headers: { 'access-control-allow-origin': '' }, error: /CLIENT_ORIGIN/ },
    { name: 'rejects a different origin', headers: { 'access-control-allow-origin': 'https://other.example' }, error: /CLIENT_ORIGIN/ },
    { name: 'rejects wildcard origins for credentials', headers: { 'access-control-allow-origin': '*' }, error: /CLIENT_ORIGIN/ },
    { name: 'requires credentials', headers: { 'access-control-allow-credentials': 'false' }, error: /credentialed/ },
    { name: 'requires POST', headers: { 'access-control-allow-methods': 'GET' }, error: /POST/ },
    { name: 'requires both headers', headers: { 'access-control-allow-headers': 'content-type' }, error: /authorization/ },
    { name: 'rejects failed preflights', status: 503, error: /HTTP 503/ },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async (subtest) => {
      const fetchMock = subtest.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(new URL(url).pathname.endsWith('/api/inquiries'), true);
        assert.equal(options.method, 'OPTIONS');
        assert.equal(options.headers.origin, origin);
        assert.equal(options.body, undefined);
        assert.ok(options.signal instanceof AbortSignal);
        return new Response(null, { status: scenario.status || 204, headers: { ...validHeaders, ...scenario.headers } });
      });
      if (scenario.error) await assert.rejects(verifyApiCors, scenario.error);
      else await verifyApiCors();
      assert.equal(fetchMock.mock.calls.length, 1);
    });
  }
});
