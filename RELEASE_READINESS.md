# Release Readiness Report

Date: 2026-07-31

## Result

The application passes the local release gate and is ready for a staging/production
deployment after the credential blocker below is resolved.

## Handover Blocker

The public Git history contains `apps/api/env` in commit
`12c65da5672df8c577a37c14127b4fb6813f7803`. That historical file contains a
credential-bearing MongoDB URI.

Before client handover:

1. Create a new MongoDB database user with a new strong password.
2. Update `MONGODB_URI` on Render and confirm `/health` and the car inventory.
3. Revoke the old MongoDB user.
4. Remove `apps/api/env` from Git history with a coordinated history rewrite.
5. Confirm all deploy services and collaborators use the rewritten repository.

The file is deleted from the current tree, ignored by Git, and the quality gate now
rejects tracked credential-bearing MongoDB URIs, private keys, and Google client
secrets.

## Automated Verification

- Secret scan: 927 tracked and non-ignored files passed.
- Lint: API and client passed with zero warnings.
- Tests: 57 passed, 0 failed.
- Builds: NestJS API and all 16 Next.js routes passed.
- Runtime dependency audit: 0 vulnerabilities.
- Production Google OAuth readiness check: passed.
- Production API smoke checks: health 200, protected scraper routes 401 without
  authorization, internal scraper route 401 without its service key, and untrusted
  CORS origins receive no allow-origin header.

`npm audit` still reports 11 high-severity findings in development-only ESLint and
Nest CLI dependency paths (`minimatch`/`brace-expansion`). They are not installed by
the production-only install and are not shipped in either runtime. Do not apply
`npm audit fix --force`; it proposes breaking toolchain changes. Recheck these when
compatible upstream releases are available.

Stable Next.js 15 currently pins vulnerable `postcss` and `sharp` versions. Scoped
npm overrides install the patched runtime versions and produce a zero-vulnerability
production audit, but `npm ls postcss sharp` can label those two overridden
dependencies as outside Next's declared ranges. Keep the overrides until a stable
Next.js release declares support for the patched versions; do not replace stable
Next.js with a canary release for handover.

Run the complete gate before every release:

```sh
npm ci
npm run verify
npm run verify:production-auth
```

## UI Verification

Safari was checked at a 1440 x 842 desktop viewport and a 430 x 900 mobile viewport.

- Home: responsive hero, navigation, calls to action, next-section visibility, light
  and dark theme controls.
- Dashboard: Japan/local market navigation, search/filter form, mobile search sheet,
  Tile/List controls, compact mobile rows, auction grade/date, yen price, and
  pagination.
- Vehicle detail: car-first gallery, auction sheet, fullscreen gallery, vehicle
  facts, vendor contact, inquiry form, and floating actions.
- Authentication: desktop and mobile login/signup layout, Google OAuth entry,
  password login, public-site return links, and theme control.
- Admin: production authentication, scraper status, and protected navigation.

Mobile navigation now scrolls away with the page so it does not cover forms or
vehicle content. Desktop navigation remains sticky.

An optional Lighthouse score was not collected because no Chromium/Chrome
installation is available on the test machine. No browser binary was added to the
handover project for this purpose.

## Performance

The Japan dashboard renders 24 cars per page across 11 pages. Its server-rendered
HTML is about 310 KB uncompressed and 75 KB transferred with compression, reduced
from approximately 2.98 MB when all 262 cards were rendered at once.

## Security Changes

- Added global and route-specific request throttling.
- Added strict DTO length/range validation and escaped database regex filters.
- Enforced HTTP(S) source URLs, ISO auction dates, bounded arrays, and runtime
  boolean validation for publish controls.
- Added controlled handling for malformed public vehicle IDs.
- Enforced access-token type in the JWT guard.
- Removed generic scraper URL-fetch endpoints that created an SSRF surface.
- Restricted scraper redirects and image downloads to approved auction hosts, with
  byte, count, and image-dimension limits.
- Restricted client image hosts to the configured API image path.
- Added a client Content Security Policy, HSTS, frame denial, MIME sniffing
  protection, referrer policy, permissions policy, and removed the framework
  signature header.
- Limited uploads to 12 files and 10 MB input per file, validated actual image
  content and dimensions, converted output to WebP, and enforced a 1 MB output cap.
- Rejected inquiries for missing or unpublished vehicles.
- Added CI verification for every pull request and push to `main`.

## Custom Domain Checklist

Assume the final website is `https://example.lk`:

1. Add `example.lk` and `www.example.lk` to the Vercel project.
2. Configure the registrar DNS records exactly as Vercel displays.
3. Set Vercel `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to
   `https://example.lk`.
4. Keep `NEXT_PUBLIC_API_URL` pointed to the production API URL ending in `/api`.
5. Set Render `CLIENT_ORIGIN` to the final HTTPS origins, comma-separated when both
   apex and `www` are supported.
6. Keep the same Google client ID on Vercel and Render.
7. Add `https://example.lk/api/auth/callback/google` to the Google OAuth client's
   authorized redirect URIs. Add the `www` callback only if that hostname can serve
   login directly.
8. Redeploy Render, then Vercel, and rerun `npm run verify:production-auth`.
9. Test login, admin access, one image upload, one inquiry, and one manual scraper
   run on the final domain.
