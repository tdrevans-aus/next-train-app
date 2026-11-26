# Jim brief — #561 follow-up: don't let a stale quick fix pick the wrong station, and dedupe concurrent callers

tim-review: no. Lane: bug-fix / product mode. Work **on the same branch** `fix/android-near-me-slow-location`
and push to PR #561. Don't open a new PR. This still blocks the `v3.0.5` Android tag.

Source: Mark's #561 QA (https://github.com/tdrevans-aus/next-train-app/pull/561#issuecomment-7194621517).
The original brief, `docs/jim-brief-android-near-me-slow-location.md`, is on the branch.

## 1. Travel mode can show the wrong station (blocking)
Travel mode's 45 s relocate tick passes `maximumAge: 30000` (`public/nearby-mode.js` ~1847). That is under
120 s, so #561's race applies, and a cached fix up to **2 minutes** old can beat the fresh one. On a moving
train that's several km, so "nearest station" is wrong until the next tick. Travel mode exists for exactly
that rider.

Required: the quick read must never be older than the caller asked for.
- When the caller's `maximumAge > 0`, the quick read uses that same `maximumAge`. In travel mode, 30 s is
  fine; it just mustn't widen to 120 s.
- When `maximumAge === 0` (open/resume), the quick read may use up to 120 s so the first paint is fast. But
  then **refine**: if the fresh request resolves afterwards, within its timeout, and maps to a different
  nearest station, update Near me to it once. This should be the same swap path as a relocate tick, with no
  flicker when the station is unchanged.

## 2. Concurrent callers each issue their own native requests
Several callers request location on open (Near me locate, the region hint, the relocate loop). Each now
issues up to two native requests. If your 13 s per caller adds up towards Tim's 30–60 s through callers
queuing, #561 doesn't help.

Required: coalesce concurrent `getCurrentPosition` calls in `web-sources/geo-native.mjs` that share
compatible options into one in-flight request per platform. A caller asking for a fresher `maximumAge`
than the in-flight one may still issue its own. Measure in the stubbed Android shell how many native calls
an app open makes before and after.

## Acceptance criteria
- `qa/geo-native-android-fast-fix.mjs` extended with these checks:
  - (a) a travel-mode call (`maximumAge: 30000`) never resolves with a fix older than 30 s, even when a
    120 s-old fix is available faster;
  - (b) open with `maximumAge: 0` paints the quick station first, then swaps to the fresh fix's station
    when it differs;
  - (c) N concurrent compatible calls on open produce one native request, not N.
- Mutation checks Mark will run:
  - widen the quick read back to 120 s for `maximumAge > 0` → (a) goes red;
  - remove the refine → (b) goes red;
  - remove the coalescing → (c) goes red.
- `public/geo-bundle.js` rebuilt with `npm run build:geo` and matching the source.
- `qa/geo-native-shell.mjs` and `qa/nearby-fresh-gps-on-reopen.mjs` still pass, and
  `node qa/run-all.mjs --smoke` passes. Let smoke run to completion, about 650 s.
- iOS and web behaviour unchanged. Don't touch any attached Android device.

## Process
Copy this brief from `C:\Users\tdrev\Projects\next-train-app\docs\jim-brief-android-near-me-561-followup.md`
(untracked in the main checkout) onto the branch and commit it. Push to `fix/android-near-me-slow-location`
and comment on #561 with the changes and the before/after native-call counts.
