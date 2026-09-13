# Play screenshot capture — 2026-09-13

Captured headless with Playwright (`store-assets/capture-frames.mjs`) against production
(https://next-train-app.vercel.app), per docs/jim-brief-play-screenshots-headless.md. Viewport 360x800 CSS px,
deviceScaleFactor 3 (-> 1080x2400), mobile UA, touch enabled, light theme, no `?test=1`, no
fixture chrome, no synthesized numbers.

| Frame | State captured | Timestamp (Perth local) | Caveat |
|---|---|---|---|
| 02-delay-honesty.png | Same Perth journey; live status text on screen: "On Time". Honest live state, not synthesized. | 13 Sept 2026, 1:57:02 pm | |
| 01-hero-leave-by.png | Perth journey Edgewater Stn -> Perth, 8-min walk, target train 14:23. Leave-card visible=true, leave time "18mins", countdown "14:23 train · leave by 14:15". Ad-free entitlement set via localStorage nextTrainAdFreeCache (adBanner hidden=true). | 13 Sept 2026, 1:57:03 pm | |
| 03-near-me.png | London Near me via real geolocation (King's Cross, 51.5308,-0.1238), region switched to uk-london-tfl. Nearest-station board resolved to "Near you · King's Cross St. Pancras (0.0 km)". | 13 Sept 2026, 1:57:09 pm | |
| 04-journeys.png | My Journeys list, two named journeys: "Morning into Perth" (Edgewater Stn -> Perth) and "Victoria line home" (King's Cross St. Pancras -> Victoria Brixton). Rendered rows: ["Morning into PerthJourneyEdgewater, towards Perth · Mon–Fri›","Victoria line homeJourneyKing's Cross St. Pancras, towards Victoria Brixton · Mon–Fri›"]. | 13 Sept 2026, 1:57:11 pm | |
| 05-coverage.png | Region picker (Country + City selects) expanded inline (via a runtime-only `size` attribute set through page.evaluate — not a public/ change) to show breadth: 7 countries, 8 cities/regions listed. Caption "33 cities. Australia, the UK and the Nordics." is applied externally per captions.md, not baked into this PNG. | 13 Sept 2026, 1:57:12 pm | |
| 06-trust.png | About page from branch jim/privacy-copy-3.0.0-v2 (PR #376, not yet merged to master) served from a throwaway local static server on 127.0.0.1:57028 — master's public/about.html is still Perth-only. This frame will look stale once #376 merges; re-run this script after that lands and this note becomes unnecessary. | 13 Sept 2026, 1:57:14 pm | |

## Notes

- 02-delay-honesty.png: whatever live status production returned at capture time was used as-is;
  if it reads "On Time", that is the honest state at that moment, not a placeholder. Re-capture in
  evening peak (Perth or London) if a genuine delay is wanted for this frame.
- 05-coverage.png: the two `<select>` elements were temporarily given a `size` attribute at runtime
  (via `page.evaluate`, not a `public/` edit) so headless Chromium renders them as inline listboxes —
  native dropdown popups don't screenshot reliably headless. The picker itself, its country/city
  lists, and the app's `public/` files are all unmodified.
- 06-trust.png: captured from branch `jim/privacy-copy-3.0.0-v2` (PR #376, unmerged) served from a
  throwaway local static server, because master's `public/about.html` is still Perth-only. Re-run
  this script once #376 merges to recapture from master/production directly.
- 08-widget.png is not produced by this script — it needs a real phone (Ruth's ship set notes this).
