# Office Time Tracker

Track daily office entry/out times and see your monthly worked-time balance at a glance.

## Tech stack

- Next.js 15 (App Router) + React 19
- Prisma + SQLite (local dev) / PostgreSQL (production)
- Tailwind CSS
- Manual auth (bcryptjs + jose signed session cookies)
- Installable PWA (manifest, service worker, offline page)

## Prerequisites

- Node.js 18.18+ (or 20+)
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local env file:

   ```bash
   cp .env.example .env
   ```

   For local development, set `DATABASE_URL` to a SQLite file instead of the Postgres URL in the example:

   ```
   DATABASE_URL="file:./dev.db"
   SESSION_SECRET="any-long-random-string"
   ```

   Generate a strong `SESSION_SECRET` with:

   ```bash
   openssl rand -base64 32
   ```

3. Create the database schema:

   ```bash
   npm run db:push
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at http://localhost:3000.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run linting |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:studio` | Open Prisma Studio to browse data |

## Deployment

Production deploys use PostgreSQL rather than SQLite (SQLite's local file doesn't persist on serverless platforms like Vercel). Point `DATABASE_URL` at a hosted Postgres instance (e.g. Neon, Supabase) and set `prisma/schema.prisma`'s datasource `provider` to `postgresql` before deploying.
