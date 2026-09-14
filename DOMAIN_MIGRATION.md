# jdmimporters.lk migration

Last checked: 2026-09-14 (Asia/Colombo).

## Current state

- Vercel project: `carsale-client`, root directory `apps/client`.
- `jdmimporters.lk` is attached to this project.
- `www.jdmimporters.lk` is attached and redirects to the apex with HTTP 308.
- The existing `carsale-client.vercel.app` address is retained.
- Both Vercel and Render were verified running `2383292`, including the
  dependency security fixes, CORS smoke check, and theme contrast fix.
- Vercel's project runtime is now explicitly Node 22, matching the repo and CI;
  the client package also declares this requirement for future deployments.
- LK Domain Registry now shows registration as Completed, expiring 2027-09-14.
- Vercel DNS is enabled. Its authoritative servers answer for the website,
  existing MX, and existing SPF records.
- The user-approved OTP was accepted for the nameserver change. Pending Server
  Records was checked: it adds `ns1.vercel-dns.com.` and `ns2.vercel-dns.com.`
  (TTL 86400), and deletes `pns101.cloudns.net.` through `pns104.cloudns.net.`.
- The registry has begun activating the change: `d.nic.lk` returns the two
  Vercel nameservers, while `ns1.ac.lk` and Cloudflare's resolver still return
  ClouDNS. Do not resubmit it or request another OTP unnecessarily.
- A direct HTTPS request to Vercel (`curl --resolve`, certificate validation
  enabled) returns 200 for `https://jdmimporters.lk`. This verifies the custom
  hostname and certificate, not yet public DNS resolution for all visitors.
- Google public DNS resolves the new domain, and Chrome loads its homepage.
  Some other resolvers still have the old delegation cached.
- Access to the existing Google Cloud project and Render service is restored.
- The existing Google OAuth client now includes the new apex origin and exact
  callback URI. The saved entries were reopened and verified; old entries and
  OAuth credentials were preserved.
- Render `CLIENT_ORIGIN` now includes the old hostname, apex, and www; a rebuild
  and deployment was requested (not Save Only). Verify live CORS after it finishes.
- Vercel production `NEXTAUTH_URL` is now `https://jdmimporters.lk`; a new frontend
  deployment is required to activate it. Login must be retested afterward.
- Production smoke checks and the metadata fallback now default to the new
  domain. An explicit `PRODUCTION_CLIENT_URL` repository variable overrides it.

## OAuth failure and prevention

The new domain previously initiated login while production `NEXTAUTH_URL`
still pointed to the old Vercel hostname. Google returned to a different host
from the one that stored the OAuth state/PKCE cookies, leading to an
`OAuthCallback` failure. Keep the initiating host and callback host identical:
use the apex as `NEXTAUTH_URL` and redirect alternate hosts before login starts.
Do not disable state/PKCE checks or share cookies across unrelated domains.

The API separately rejected browser requests from the new domain because its
`CLIENT_ORIGIN` only contained the old hostname. The scheduled and deployment
smoke check validates the canonical callback, client-ID agreement, and exact
origin CORS together. Keep that check targeting the canonical production domain.

## Prepared DNS zone

Vercel automatically manages the apex and wildcard ALIAS records for this
project. The target and returned IPs may change; do not replace those managed
records with stale fixed addresses. The following original mail records were
copied from the live ClouDNS zone before requesting the nameserver change:

| Name | Type | Value | TTL |
| --- | --- | --- | --- |
| `jdmimporters.lk.` | MX | `0 mail.mymailportal.lk.` | 3600 |
| `jdmimporters.lk.` | TXT | `v=spf1 mx ~all` | 3600 |

Both records, plus apex and www address answers, were verified directly against
`ns1.vercel-dns.com`. ClouDNS refused a full zone transfer; this does not establish
that every possible mail-related subdomain record was inventoried. The original
registration TXT `Chamara` was no longer present in live DNS and was not restored.

Use only one LK Domain Registry tab: multiple registry tabs trigger a portal
error and can reset unsaved form fields. Inspect visible confirmation buttons,
then check Pending Records separately after OTP approval. Registry acceptance
is not the same as public DNS activation.

## Finish the migration

1. Wait for the already accepted nameserver request to activate. Check public
   NS records and the registry's Current Running Records. Verify apex and www
   resolve, mail records remain present, Vercel reports valid configuration,
   and HTTPS works. If registry processing stalls, contact its support about
   the two pending Vercel nameservers rather than submitting duplicate requests.
2. In the existing Google OAuth web client for `carsale-web`, add the origin
   `https://jdmimporters.lk` and exact redirect URI
   `https://jdmimporters.lk/api/auth/callback/google`. Retain the old entries;
   do not replace the OAuth client ID or secret.
3. In the Render account that owns `carsale-1`, append
   `https://jdmimporters.lk,https://www.jdmimporters.lk` to `CLIENT_ORIGIN`.
   Preserve all existing origins. Deploy and check both new origins with CORS
   preflight requests. Do not replace `API_PUBLIC_URL` or database settings.
4. Set Vercel's production `NEXTAUTH_URL` to `https://jdmimporters.lk` and redeploy.
   Keep `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, and the Google keys unchanged.
   Metadata uses `NEXTAUTH_URL` unless `NEXT_PUBLIC_SITE_URL` explicitly overrides it.
5. If the GitHub repository variable `PRODUCTION_CLIENT_URL` exists, set it to
   `https://jdmimporters.lk`. Otherwise the authentication smoke workflow uses
   that domain by default.
6. Run `CLIENT_URL=https://jdmimporters.lk npm run verify:production-auth`.
   This checks the generated callback, frontend/backend client-ID agreement,
   and exact-origin browser API CORS. It does not prove that Google accepted
   a real sign-in.
7. Test real Google login, admin access, vehicle images, handover images,
   inquiries, and the www redirect on the new HTTPS address. Keep the old
   hostname available until this is complete. Then redirect the old hostname
   to the new canonical host before initiating sign-in, so OAuth state cookies
   are not split between the old host and the new callback host.

## Verification before switching

- Existing public homepage: HTTP 200.
- Existing production authentication configuration smoke test: passed.
- GitHub's remote quality gate and production auth/CORS check passed for
  `36427a6`. New-domain API CORS is still blocked until Render is configured.
- Live desktop/mobile homepage, listing, and vehicle page checks: 200 responses,
  loaded on-screen images, no horizontal overflow or JavaScript errors.
- Mobile search popup, Toyota filter, list navigation, theme switching, and
  login-page layout were checked. A theme-transition contrast issue on vehicle
  cards was identified; card transitions now exclude background and text colors.
- Full release verification under Node 22.23.2: lint, API tests, API/client
  production builds, tracked-secret scan, and production audit passed.
- New CORS smoke regression tests: all eight scenarios passed (nine TAP tests).
- Full dependency audit, including development dependencies: zero findings.
- Next.js remains on 15.5.25. Keep its root override aligned with the client
  version when updating; it also prevents auth peers resolving another major.
- Tracked-secret scan and `git diff --check`: passed.

## Rollback

If the new sign-in fails after switching, restore Vercel's production
`NEXTAUTH_URL` to `https://carsale-client.vercel.app`, redeploy, and restore the
GitHub `PRODUCTION_CLIENT_URL` variable to that URL. Remove the old hostname's
redirect before using it to sign in. Retain both domains and the
old Google callback throughout the transition. Do not rotate working credentials
as a response to an origin or redirect mismatch.

## Commercial hosting

The current Vercel team uses Hobby. Vercel restricts that plan to non-commercial
personal use: https://vercel.com/docs/plans/hobby. Arrange the owner's approval
for a commercial plan before client handover. No paid upgrade was performed.
