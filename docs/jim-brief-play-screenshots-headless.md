# Jim brief — capture the Play phone screenshots headless from the web build

Mode: bug-fix / product (CLAUDE.md "Bug-fix lane"). tim-review: yes for the *images* (Tim and
Ruth accept or reject each frame); no code review needed. Lane lock: not required.
Written 13 Sep 2026; Tim chose path 1 (submit Play production today).

## Why

Ruth's LB-10 review (`docs/ruth-signoff-lb10.md` §3) calls the missing phone screenshots the real
listing blocker. `store-assets/frames/` is empty. The shot list and overlay lines are in
`store-assets/captions.md`. Ruth's ship set: **01 hero (Perth) · 02 delay · 03 Near me (London) ·
04 Journeys · new coverage frame · 06 trust · 08 widget**. 08 needs a real phone (Tim). The other
six can be captured from the web app with Playwright at phone size, against **production** data.

## Rules (from captions.md, non-negotiable)

- No test AdMob or placeholder ads; no `?test=1`; no fixture chrome; no debug overlays.
- Real data: production API (`https://next-train-app.vercel.app`), not a local fixture.
- Don't fake numbers. If no delayed train is visible at capture time, capture the honest live
  state for 02 and say so in the report; do not synthesise a delay.
- Portrait, ≥1080 px wide. Use viewport 360×800 CSS px at `deviceScaleFactor: 3` (→ 1080×2400),
  mobile UA, touch enabled, light theme unless dark looks clearly better, then note it.
- The ad-free state must show no banner: use whatever legitimate mechanism the app already has
  for a purchased/ad-free session in a browser (check `public/ad-free-purchase.js`,
  `public/ads.js`, localStorage keys) — never a test-mode flag that changes chrome.

## Frames to produce (PNG, `store-assets/frames/`)

| File | Set-up | Notes |
|---|---|---|
| `01-hero-leave-by.png` | A saved Perth journey (e.g. Edgewater → Perth, 8-min walk) on the Journeys tab with the Leave-by clock prominent | Perth |
| `02-delay-honesty.png` | Same journey or its station board with live status visible | Honest state only |
| `03-near-me.png` | Near me for a London station (grant geolocation to a London coordinate via Playwright `context.setGeolocation`, e.g. King's Cross 51.5308,-0.1238) | London, per Ruth |
| `04-journeys.png` | My Journeys with **two named** journeys (one Perth, one London is fine) | |
| `05-coverage.png` | City/region picker showing the breadth of coverage | New frame Ruth asked for; caption "33 cities. Australia, the UK and the Nordics." |
| `06-trust.png` | About page (`/about.html`) — note #376's multi-city copy is not merged yet; capture from the PR branch's `public/about.html` served locally if master's is still Perth-only, and say which | |

Also write `store-assets/frames/README-capture-2026-09-13.md`: for each frame, the URL/state,
viewport, theme, timestamp (Perth local), and anything Tim/Ruth should know (e.g. "02: no delay
was showing at 14:20; re-capture in the evening peak if a delay is wanted").

## How

- Write a one-off script `store-assets/capture-frames.mjs` (Playwright, ESM, no new deps) that
  drives production and writes the PNGs. Journeys are on-device state: create them through the
  UI or by seeding the same localStorage the app uses (read `public/app.js` to find the key and
  shape), then reload. Keep the script; it is the re-capture tool for 3.x.
- Do not modify any `public/` file. Do not run the smoke suite; this is not an app change.
  `node qa/no-hardcoded-qa-port.mjs` must still pass (keep the script out of `qa/`).
- Commit the script, the six PNGs and the README on branch `jim/play-screenshots`, push, open a
  PR titled "Play screenshots — for Tim/Ruth review" with the six images visible in the
  description (drag-in or `!()[]` links to the raw files). Do not merge.
- Leave no browsers or servers running; confirm with `netstat -ano | findstr LISTENING`.
