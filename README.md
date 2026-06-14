# Ceylon JDM Orders

Separate API and client apps for publishing Japan auction / JDM reconditioned cars with transparent Sri Lanka landed-cost calculations.

## Stack

- `apps/api`: NestJS, MongoDB Atlas, Mongoose, Google ID token verification, Helmet, CORS, DTO validation.
- `apps/client`: Next.js App Router, NextAuth Google login, Tailwind CSS, responsive customer dashboard.

This split is easy to host for free or low cost:

- Client: Vercel, Netlify, Cloudflare Pages.
- API: Render, Railway, Fly.io, Koyeb, or a small VPS.
- Database: MongoDB Atlas.

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/client/.env.example apps/client/.env.local
npm run seed
npm run dev
```

Client runs at `http://localhost:3000`.
API runs at `http://localhost:4000/api`.

## Google login

Create an OAuth client in Google Cloud Console.

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- Put the client ID in both API and client env files.
- Put the client secret only in `apps/client/.env.local`.
- Put owner/staff emails in `ADMIN_EMAILS` for protected API routes.

## Security notes

- Do not commit real `.env` files.
- Rotate the MongoDB password if it has been shared publicly.
- Keep Atlas network access restricted when moving beyond local development.
- Customer inquiry creation is public; listing management, scraper import, and inquiry viewing are admin guarded.

## Auction scraping

The API includes a protected scraper module:

- `POST /api/scraper/json-feed` imports a normalized JSON array of cars.
- `POST /api/scraper/preview-html` previews page title and links for building source-specific adapters.

Many Japan auction sites require accounts and have terms that limit automated scraping. Add one adapter per approved source and keep source parsing inside `apps/api/src/scraper`.
