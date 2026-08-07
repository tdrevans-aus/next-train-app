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

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Vercel auto-detects the setup (`public` folder + `api` functions).
4. Click **Deploy**.
5. Open your URL on your phone → Chrome menu → **Add to Home screen**.

No environment variables needed.

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
