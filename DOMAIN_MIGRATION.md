# jdmimporters.lk migration

Last checked: 2026-09-14 (Asia/Colombo).

## Current state

- Vercel project: `carsale-client`, root directory `apps/client`.
- `jdmimporters.lk` is attached to this project.
- `www.jdmimporters.lk` is attached and redirects to the apex with HTTP 308.
- The existing `carsale-client.vercel.app` address is retained as an HTTP 308
  redirect to the apex, preserving paths and query strings.
- Both Vercel and Render were verified running `3bd3768`, including the
  dependency security fixes, CORS smoke check, and theme contrast fix.
- Vercel's project runtime is now explicitly Node 22, matching the repo and CI;
  the client package also declares this requirement for future deployments.
- LK Domain Registry now shows registration as Completed, expiring 2027-09-14.
- Vercel DNS is enabled. Its authoritative servers answer for the website,
  existing MX, and existing SPF records.
- The user-approved OTP was accepted for the nameserver change. Pending Server
  Records was checked: it adds `ns1.vercel-dns.com.` and `ns2.vercel-dns.com.`
  (TTL 86400), and deletes `pns101.cloudns.net.` through `pns104.cloudns.net.`.
- The registry nameserver change is active: `ns1.ac.lk` now returns both Vercel
  nameservers, matching the previously verified `d.nic.lk` delegation.
- Both Google (8.8.8.8) and Cloudflare (1.1.1.1) resolve the new domain.
  Normal local DNS and HTTPS also work, with HTTP 200 and valid TLS.
  Vercel reports `misconfigured: false`. No further registry request is needed.
- Access to the existing Google Cloud project and Render service is restored.
- The existing Google OAuth client now includes the new apex origin and exact
  callback URI. The saved entries were reopened and verified; old entries and
  OAuth credentials were preserved.
- Render `CLIENT_ORIGIN` includes the old hostname, apex, and www. The service
  was rebuilt and deployed, and both new origins pass credentialed CORS preflight.
- Vercel production `NEXTAUTH_URL` is `https://jdmimporters.lk` and the frontend
  was redeployed. A fresh Chrome Google sign-in returned to the new-domain admin
  page with an ADMIN session and no session error.
- Production smoke checks and the metadata fallback now default to the new
  domain. GitHub currently has no `PRODUCTION_CLIENT_URL` variable overriding it.

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

## Configuration to preserve

1. Keep Vercel's managed DNS entries and the existing mail records. Verify apex
   and www resolution and HTTPS after any future DNS changes. Do not resubmit
   the completed registry request.
2. In the existing Google OAuth web client for `carsale-web`, retain the origin
   `https://jdmimporters.lk` and exact redirect URI
   `https://jdmimporters.lk/api/auth/callback/google`. Retain the old entries;
   do not replace the OAuth client ID or secret.
3. On Render's `carsale-1`, keep
   `https://jdmimporters.lk,https://www.jdmimporters.lk` in `CLIENT_ORIGIN`.
   Preserve all existing origins. Deploy and check both new origins with CORS
   preflight requests. Do not replace `API_PUBLIC_URL` or database settings.
4. Keep Vercel's production `NEXTAUTH_URL` at `https://jdmimporters.lk`.
   Redeploy after changing production environment variables.
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
   inquiries, and alternate-host redirects after future authentication changes.
   Keep both alternate hosts redirecting to the apex before sign-in starts.

## Verification

- New-domain homepage: HTTP 200 through normal DNS and valid HTTPS.
- New-domain production authentication configuration and API CORS test: passed.
- GitHub's remote quality gate and production auth/CORS check passed for
  `3bd3768`. The daily and deployment-triggered checks now target the new domain.
- Real Google login in the user's Chrome session: signed out, clicked Continue
  with Google, and returned to `https://jdmimporters.lk/admin` as ADMIN.
- Admin sold-car page: 42 published images, five thumbnails loaded, pagination
  visible, and no horizontal overflow. No production posts were modified.
- New-domain desktop (1440x1000) and mobile (390x844) homepage/listing screenshots
  were inspected: visible images loaded and no horizontal overflow. Homepage,
  listing, and a car detail page returned 200 with no JavaScript errors.
- Old Vercel hostname and www: HTTP 308 to apex, preserving path and query.
- Existing MX and SPF records were also verified through Google public DNS.
- Inquiry CORS was tested without submitting a customer inquiry; external
  email delivery was not tested as part of this domain switch.
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

Render still uses a Free instance, which sleeps after inactivity and can delay
requests during startup. No paid instance change was performed.
