# Jim brief: "Couldn't load directions" is one generic message for three different failures

**For:** Jim (implement)
**From:** Tim (via top-level session)
**Date:** 2 Sep 2026
**Status:** Ready to fix
**Related:** `public/journey-detail.js` (`loadDirectionsForSelect`, `fetchDirectionsFromApi`), `public/app.js` (`fetchDirectionsFromApi` wrapper)
**Out of scope:** Any change to what the underlying adapters return — this is display/copy only. Do not touch `lib/providers/*` or `lib/cities/*/dogfood-next-train.js`.

---

## 1. What Tim saw

Picking a departure station on the Journeys screen and opening "Trains to" can show:

> Couldn't load directions — try again

This exact string is shown for at least three genuinely different situations, confirmed by direct testing:

1. **No trains currently scheduled** — e.g. a live Darwin query at 2:30am UK time genuinely returns zero departures for a real, working station (Birmingham New Street and Nottingham both returned zero trips at that hour too — this is real-time-correct, not broken). Retrying in a few hours would work.
2. **A feed that will never return data** — e.g. Merseyrail (`MerseyrailFeedUnconfirmedError`), NET tram, or West Midlands Metro (`MissingTfwmCredentialsError`) — these throw unconditionally, by design, until a real feed exists. Retrying can never help.
3. **A missing server config** — e.g. `MissingDarwinTokenError` if `DARWIN_LDB_TOKEN` isn't set in the deployment. Retrying can never help until an operator fixes the config.

Telling a user to "try again" for cases 2 and 3 is actively misleading — it implies a transient problem when the honest answer is "this doesn't exist yet" or "this is broken in a way only an operator can fix."

## 2. Fix

`public/journey-detail.js`'s `loadDirectionsForSelect` catches every error into one fallback branch (around the `Couldn't load directions — try again` string). Distinguish at minimum:

- **Empty result, no error thrown** (case 1): keep the existing `"No directions available"` option that already exists for the empty-array case — check it actually reads that way to the user right now (it may already be adequate; confirm rather than assume).
- **A named "feed not available" error** (case 2 — `MerseyrailFeedUnconfirmedError`, `NetFeedUnconfirmedError`, `MissingTfwmCredentialsError`, or whatever else exists under `lib/providers/*` with this shape — grep for `class.*Error extends Error` across `lib/providers/` to find the full set): show something like `"This service isn't available yet"` — no "try again."
- **A missing-token/config error** (case 3 — `MissingDarwinTokenError`): this one is really an operator problem, not a user one. Decide what's honest to show a rider (something like `"Departures aren't available right now"` is probably right — don't expose internal error names or "contact support" copy to end users) and say in your PR notes what you chose and why.

The error objects reaching the browser come back through `/api/directions` → `apiResultError(...)` (see `fetchDirectionsFromApi` in `journey-detail.js`). Check what shape that error takes client-side today (does the specific error class/name survive the HTTP round-trip, or does the API route already collapse everything to a generic shape before it reaches the browser?) — you may need to have the API route itself distinguish these cases in its response (e.g. a `reason` or `code` field) rather than trying to infer it purely client-side from a already-generic error. Investigate before implementing; don't guess the wire shape.

## 3. Verify

- Reproduce all three cases against a real UK region (a live "no trains right now" state is time-of-day dependent — you may need to fake/force it, or just test at an hour when it's naturally true, or test against a feed-unconfirmed station like any Merseyrail stop for case 2, which is always reproducible).
- Confirm each shows distinct, accurate copy — no case says "try again" unless retrying could actually help.
- `node qa/run-all.mjs --smoke` stays green.
