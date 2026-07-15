# Deployment

This repository is a monorepo with:

- `apps/client`: Next.js storefront/admin client
- `apps/api`: NestJS API, MongoDB connection, JP Center scraper, local image serving

## Canonical production services

Only these services should be connected to the `main` branch:

- Vercel project `carsale-client`, with Root Directory set to `apps/client`
- Render web service `carsale-1`, with build command
  `npm install && npm run build --workspace apps/api`

Do not connect a second Vercel API project or a repository-root Vercel project.
Render must not run the root `npm run build`, because that also builds the
Next.js client using environment variables that belong exclusively to Vercel.

## Vercel client

Import the GitHub repository in Vercel and use these settings:

- Framework Preset: `Next.js`
- Root Directory: `apps/client`
- Build Command: `npm run build`
- Install Command: leave default
- Output Directory: leave default

If the deployed site looks like plain HTML without styling, the Vercel project
was almost certainly imported from the repository root. Open the Vercel project
settings, set **Root Directory** to `apps/client`, then redeploy.

Required environment variables:

```text
NEXT_PUBLIC_API_URL=https://carsale-1.onrender.com/api
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=generate-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

The client validates these values during its production build. Missing,
placeholder, or malformed OAuth settings fail the deployment instead of
producing a broken login page.

## Render API

Create a Render Blueprint from this repo, or create a Web Service manually:

- Runtime: Node
- Build Command: `npm install && npm run build --workspace apps/api`
- Start Command: `npm run start --workspace apps/api`

Required environment variables:

```text
MONGODB_URI=mongodb+srv://...
MONGODB_DB=carsale
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
API_PUBLIC_URL=https://your-render-api.onrender.com
AUTH_JWT_SECRET=generate-a-long-random-secret
ADMIN_INITIAL_NAME=Carsale Administrator
ADMIN_INITIAL_EMAIL=owner@example.com
ADMIN_INITIAL_PASSWORD=choose-a-strong-initial-password
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
ADMIN_EMAILS=owner@example.com,staff@example.com
JPCENTER_USERNAME=your-jpcenter-username
JPCENTER_PASSWORD=your-jpcenter-password
```

`GOOGLE_CLIENT_ID` must be identical in Vercel and Render. The API validates
it during startup and exposes only a one-way fingerprint at
`/api/auth/readiness`; the OAuth client ID itself is not returned.

## Google OAuth release check

The production smoke test verifies all three parts of the deployed contract:

- NextAuth can create a Google authorization request.
- The redirect URI is exactly
  `https://carsale-client.vercel.app/api/auth/callback/google`.
- Vercel and Render use the same Google OAuth client ID.

Run it at any time with:

```text
npm run verify:production-auth
```

GitHub Actions also runs this check after successful deployment status events
and once per day. A missing API setting now prevents the Render service from
starting; Render retains the last healthy deployment instead of replacing it
with a release whose Google login fails at runtime.

## Notes

The API currently serves scraped images from `apps/api/public/images`. Vehicle photos bypass the Next.js image proxy because a sleeping Render service can exceed its upstream timeout. Uploaded images still require persistent storage; use a Render persistent disk or move uploads to Cloudinary, S3, or Vercel Blob before relying on them in production.

## JP Center scraper service

The scraper is split between two services:

- `carsale-api` authenticates with JP Center, imports/upserts cars, and stores run history in MongoDB.
- `carsale-jpcenter-scraper` is a separate scheduled worker that triggers the API and waits for final counts.

The included Render Blueprint runs the worker every six hours. Set the same
`SCRAPER_SERVICE_KEY` value on both Render services. Keep
`JPCENTER_USERNAME` and `JPCENTER_PASSWORD` on the API service only.

Local commands:

```text
npm run dev:scraper
npm run scraper:run
```

The admin can trigger a run and inspect fetched, inserted, updated, and failed
counts at `/admin/scraper`.
