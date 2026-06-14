# Deployment

This repository is a monorepo with:

- `apps/client`: Next.js storefront/admin client
- `apps/api`: NestJS API, MongoDB connection, JP Center scraper, local image serving

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
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
ADMIN_EMAILS=owner@example.com,staff@example.com
JPCENTER_USERNAME=your-jpcenter-username
JPCENTER_PASSWORD=your-jpcenter-password
```

## Notes

The API currently serves scraped images from `apps/api/public/images`. This is acceptable for a development demo if those files are deployed with the API. For production, move uploaded/scraped images to Cloudinary, S3, or Vercel Blob and store those public URLs in MongoDB.
