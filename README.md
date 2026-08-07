# Next Train

Open the app and see when to leave for your next train. Pick your station and direction once — settings are saved on your device.

## Features

- **Leave by** time (configurable minutes before the train arrives)
- Live Transperth data with delays
- **Settings** (⚙) — station, direction, display label, leave-before minutes
- Settings saved in **localStorage** (per device)
- **URL parameters** to pre-fill or share a commute:
  `?station=Edgewater%20Stn&direction=Perth&leaveBefore=3`

## Local development

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel (recommended)

**Repo:** [github.com/tdrevans-aus/next-train-app](https://github.com/tdrevans-aus/next-train-app)

1. Go to [vercel.com/new](https://vercel.com/new) → import **tdrevans-aus/next-train-app**.
2. Framework preset: **Other** (no build step). Root directory: project root. Publish directory: leave default (`public` is auto-detected).
3. Click **Deploy** (no environment variables needed).
4. Open your production URL on your phone → Chrome menu → **Add to Home screen**.

Or from this folder after `npx vercel login`:

```bash
npx vercel --prod
```

`vercel.json` sets short cache headers on `/api/*` so live times stay fresh.

## Deploy to Netlify

1. Push to GitHub.
2. Go to [netlify.com](https://netlify.com) → **Add new site** → import repo.
3. Build settings are in `netlify.toml` (publish `public`, serverless functions).
4. Deploy, then add to home screen on your phone.

## Default commute

Out of the box defaults to **Edgewater → Perth** (Murdoch via Perth), leave 3 minutes before the train.

## How it works

- Frontend: static files in `public/`
- API: serverless functions proxy Transperth’s live times service (no browser CORS issues)
- `lib/train-times.js` — shared logic used locally and in the cloud

## Notes

- Uses unofficial Transperth live data — same source as the website.
- Settings are stored on your phone/browser only, not on a server.

## Advertising (Google AdSense)

The app includes an ad slot below the train details (not in the hero card), a cookie consent banner, and Privacy / About pages.

### Setup

1. Apply at [Google AdSense](https://www.google.com/adsense) with your deployed URL.
2. Copy `public/site-config.example.json` values into `public/site-config.json`:
   ```json
   {
     "adsenseClient": "ca-pub-XXXXXXXXXXXXXXXX",
     "adsenseSlot": "XXXXXXXXXX"
   }
   ```
3. Add your contact details on `public/about.html` before going live.
4. Deploy. On first visit, users see **Accept** / **No thanks** — ads load only after Accept.

With empty `site-config.json` values, no ads or consent banner appear (fine for local dev).

## Android app (Capacitor + AdMob)

The Play Store build uses **Capacitor** to wrap the app and **Google AdMob** for ads (not AdSense).

Ad IDs live in `public/site-config.json`:

```json
{
  "admobAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
  "admobBannerId": "ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ",
  "admobTestMode": true
}
```

Set `admobTestMode` to `false` before a production Play Store release.

### Build on your PC

Prerequisites: [Android Studio](https://developer.android.com/studio) with SDK installed.

```bash
npm install
npm run cap:sync
npm run cap:open
```

In Android Studio: **Run** on a connected phone or emulator. The app loads the hosted Vercel URL (`capacitor.config.ts`).

### First run

1. Accept the ad consent banner to show a test banner at the bottom.
2. Train times come from your live Vercel API.
