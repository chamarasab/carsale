# jdmimporters.lk migration

Last checked: 2026-09-14 (Asia/Colombo).

## Current state

- Vercel project: `carsale-client`, root directory `apps/client`.
- `jdmimporters.lk` is attached to this project.
- `www.jdmimporters.lk` is attached and redirects to the apex with HTTP 308.
- The existing `carsale-client.vercel.app` address is retained.
- LK Domain Registry shows the purchased domain as Reserved. Public DNS has not
  started resolving it yet.
- DNS changes have been filled in through the registry DNS manager. They are
  awaiting the registrant's OTP approval, so submission is NOT confirmed yet.
- The currently signed-in Render account does not have the existing service;
  the Google Cloud account lacks access to `carsale-web`.
- Production auth environment variables have NOT been changed. Keep them this
  way until the prerequisites below are verified.

## DNS records

The following web records were obtained from Vercel's domain configuration API
for this project. Re-check Vercel if resuming substantially later.

| Name | Type | Value | TTL |
| --- | --- | --- | --- |
| `jdmimporters.lk.` | A | `216.198.79.1` | 300 |
| `jdmimporters.lk.` | A | `64.29.17.1` | 300 |
| `www.jdmimporters.lk.` | CNAME | `4fa4106121e88d8f.vercel-dns-017.com.` | 300 |

Retain the pre-existing TXT record and any mail records. Nameservers were not
changed. After approving the OTP, check Pending Records and Current Running
Records separately. Registry acceptance is not the same as public DNS activation.

## Finish the migration

1. Approve the DNS request in the LK Domain Registry account. Wait for both
   hostnames to resolve, Vercel to report valid configuration, and HTTPS to work.
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
   This checks the generated callback and frontend/backend client-ID agreement;
   it does not prove that Google accepted a real sign-in.
7. Test real Google login, admin access, vehicle images, handover images,
   inquiries, and the www redirect on the new HTTPS address. Keep the old
   hostname available until this is complete.

## Verification before switching

- Existing public homepage: HTTP 200.
- Existing production authentication configuration smoke test: passed.
- Client lint and production build: passed.
- Tracked-secret scan and `git diff --check`: passed.

## Rollback

If the new sign-in fails after switching, restore Vercel's production
`NEXTAUTH_URL` to `https://carsale-client.vercel.app`, redeploy, and restore the
GitHub `PRODUCTION_CLIENT_URL` variable to that URL. Retain both domains and the
old Google callback throughout the transition. Do not rotate working credentials
as a response to an origin or redirect mismatch.
