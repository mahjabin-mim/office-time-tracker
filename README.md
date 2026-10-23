# Office Time Tracker

Track daily office entry/out times and see your monthly worked-time balance at a glance.

## Tech stack

- Next.js 15 (App Router) + React 19
- Prisma + PostgreSQL
- Tailwind CSS
- Manual auth (bcryptjs + jose signed session cookies), plus optional Google sign-in (OAuth 2.0 + PKCE)
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

   Set `DATABASE_URL` to your Postgres connection string (e.g. from a free Neon or Supabase database), and set `SESSION_SECRET` to a random string.

   Generate a strong `SESSION_SECRET` with:

   ```bash
   openssl rand -base64 32
   ```

   To enable **Continue with Google**, also set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   (see [Google sign-in](#google-sign-in) below). Without them the app works normally with
   email/password only.

3. Create the database schema:

   ```bash
   npm run db:push
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app runs at http://localhost:3001.

## Features

- **One-tap Clock in / Clock out** on the dashboard, with a live progress ring, the time left, and when you can leave
- **Half days**: tick "Half day" when adding a day. Expected time drops to your half-day length
  (4h 30m by default, set in Settings → Working Schedule)
- **Leave, sick days, and holidays**: mark any day (including future ones) so it never counts as
  missing or short
- **Work on a day off** counts entirely as extra time
- **Time zones**: "today" and "now" follow each user's device time zone, not the server's
- Days before you signed up show as *Not tracked* instead of *Missing* (you can still backfill them)
- Monthly summary with stats, a daily chart, and a full attendance table
- **Yearly overview**: balance per month, a running-total trend line, and a month-by-month table
- **Reminders** (push notifications): forgot to clock in, time to leave, forgot to clock out
- **Export**: CSV per month or year, your full history, and a full JSON backup (Settings → Your data)
- **Google sign-in**, with linking/unlinking from Settings → Sign-in methods
- **Forgot password**: emails a single-use reset link that expires after an hour
- **Account deletion** from Settings → Delete account (removes the user, schedule, and all attendance)
- **Mobile apps**: an Android app (download from the site) and iPhone/iPad via Add to Home Screen
- Light/dark themes, installable PWA, and animations that respect the OS "reduce motion" setting

## Google sign-in

1. In [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials),
   configure the OAuth consent screen, then create an **OAuth client ID** of type **Web application**.
2. Under **Authorized redirect URIs**, add one entry per place the app runs:
   - `http://localhost:3001/api/auth/google/callback`
   - `https://<your-vercel-domain>/api/auth/google/callback`
3. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (locally in
   `.env`, and in the Vercel project's environment variables).

Signing in with Google creates an account on first use. If a password account already exists with
the same email, the Google account is linked to it.

## Password reset emails

"Forgot password?" sends the reset link over SMTP. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS` (and optionally `MAIL_FROM`), plus `APP_URL` so links always point at your real
domain. With Gmail, enable 2-Step Verification and use an
[App Password](https://myaccount.google.com/apppasswords) as `SMTP_PASS`.

Without SMTP settings, local development prints the reset link in the dev server's terminal, and
production tells users that email reset isn't available yet.

## Reminders

Reminders are Web Push notifications, so they reach you even when the app is closed.

1. Generate keys with `npx web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (an https URL or `mailto:`, not localhost).
2. Set `CRON_SECRET` to a long random string.
3. Something must call `GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET` every
   few minutes. `.github/workflows/reminders.yml` does this every 5 minutes; add the repository
   secrets `APP_URL` and `CRON_SECRET` to enable it. (Vercel's free plan only allows daily crons.)
4. In the app, open Settings → Reminders → **Turn on** on each device and send a test.

On iPhone, notifications only work after adding the app to the Home Screen. While the app is open,
the "time to leave" reminder also fires on time from the page itself.

## Mobile apps

- **Android**: a Trusted Web Activity built with Bubblewrap that opens the live site full screen.
  `https://officetimetracker.vercel.app/download/android` always redirects to the APK attached to
  the latest GitHub release. The app launches with `?source=app`, which hides the site's
  "Get the mobile app" links inside it. `public/.well-known/assetlinks.json` holds the signing
  key's fingerprint so Android shows it without a browser bar.
- **iPhone/iPad**: Safari → Share → Add to Home Screen. It runs full screen as a home-screen web
  app (detected via `navigator.standalone`), and push reminders work on iOS 16.4+. A native App
  Store build would need Xcode and a paid Apple Developer account.

To publish a new Android version, rebuild it (see the separate `office-time-tracker-android`
project) and attach it to a new release:

```bash
gh release create v1.0.2 OfficeTimeTracker.apk --title "Android app 1.0.2" --notes "…"
```

## Tests

```bash
npm test          # unit tests (Vitest)
npm run typecheck # TypeScript
```

The tests cover the time and balance rules (half days, leave, days off, time zones, overnight
shifts), monthly/yearly summaries, reminder timing, CSV export, and input validation. CI runs both
on every push (`.github/workflows/ci.yml`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run linting |
| `npm test` | Run the unit tests |
| `npm run typecheck` | Type-check the project |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:studio` | Open Prisma Studio to browse data |

## Deployment

Deployed on Vercel with a Neon Postgres database at https://officetimetracker.vercel.app.
`DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, the `VAPID_*` keys,
`CRON_SECRET`, `APP_URL`, and the `SMTP_*` settings are set as environment variables on the Vercel
project.

After pulling schema changes, run `npm run db:push` against the production database before deploying.
