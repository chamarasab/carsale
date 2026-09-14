# jdmimporters.lk migration

Last checked: 2026-09-14 (Asia/Colombo).

## Current state

- Vercel project: `carsale-client`, root directory `apps/client`.
- `jdmimporters.lk` is attached to this project.
- `www.jdmimporters.lk` is attached and redirects to the apex with HTTP 308.
- The existing `carsale-client.vercel.app` address is retained.
- Security fixes and the CORS smoke check were pushed in `220d591`; Vercel
  promoted that production deployment successfully. Render deployment status
  cannot yet be verified from the currently signed-in account.
- Vercel's project runtime is now explicitly Node 22, matching the repo and CI;
  the client package also declares this requirement for future deployments.
- LK Domain Registry now shows registration as Completed, expiring 2027-09-14.
- Vercel DNS is enabled. Its authoritative servers answer for the website,
  existing MX, and existing SPF records.
- The user-approved OTP was accepted for the nameserver change. Pending Server
  Records was checked: it adds `ns1.vercel-dns.com.` and `ns2.vercel-dns.com.`
  (TTL 86400), and deletes `pns101.cloudns.net.` through `pns104.cloudns.net.`.
- Public DNS still reports the old ClouDNS delegation. The accepted request is
  queued, not yet active. Do not resubmit it or request another OTP unnecessarily.
- The currently signed-in Render account does not have the existing service;
  the Google Cloud account lacks access to `carsale-web`.
- Production auth environment variables have NOT been changed. Keep them this
  way until the prerequisites below are verified.

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
5. Set the GitHub repository variable `PRODUCTION_CLIENT_URL` to
   `https://jdmimporters.lk`. The existing authentication smoke workflow uses it.
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
GitHub `PRODUCTION_CLIENT_URL` variable to that URL. Retain both domains and the
old Google callback throughout the transition. Do not rotate working credentials
as a response to an origin or redirect mismatch.

## Commercial hosting

The current Vercel team uses Hobby. Vercel restricts that plan to non-commercial
personal use: https://vercel.com/docs/plans/hobby. Arrange the owner's approval
for a commercial plan before client handover. No paid upgrade was performed.
