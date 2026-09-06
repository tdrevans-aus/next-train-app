# Jim brief — "feed unconfirmed" boards show internal error text to riders

**Date:** 7 Sep 2026 · **Lane:** bug-fix lane (CLAUDE.md) · **tim-review: yes** (rider copy; Tim saw this one himself).
**Dispatch:** `subagent_type: jim`, `isolation: "worktree"`. Branch `feed-unconfirmed-rider-copy`. Commit, push, open a PR linking this brief.

## Symptom (Tim, emulator, 7 Sep 2026)
Near me → Altrincham (Metrolink) paints this in the hero:

> Manchester Metrolink has no confirmed real-time GTFS-RT feed — Altrincham board cannot be built. TfGM's developer portal (opendata.tfgm.com) is deprecated and no longer issues new API keys; existing keys continue to function on an unconfirmed timeline. No public GTFS-RT feed has been confirmed anywhere. See docs/greater-manchester-d1/hazard-pack.md and jim-handoff.md skip risk section.

That is the `MetrolinkFeedUnconfirmedError` message from `lib/providers/greater-manchester.js:90`, written for the pipeline, with doc paths and an agent's name in it. Tim's reaction: "WTF is this?"

## Cause
`api/board.js:166-168` catches every provider error and returns `500 { error: error.message }`; `public/nearby-mode.js` (lines ~1990, ~2723, ~2783, ~2922) and the journey board path in `public/app.js` (~5517, ~5574) display `error.message` as-is. The board-eligibility rule (`docs/board-eligibility-rule.md`) requires an excluded/unconfirmed service to surface an explicit error rather than a silent empty board — that part is right and stays. The rider-facing text is the bug.

Same family, same fix: `NetFeedUnconfirmedError` (east-midlands.js), `MetroFeedUnconfirmedError` (north-east.js), `SupertramFeedUnconfirmedError` (south-yorkshire.js / glasgow.js — grep `FeedUnconfirmedError` under `lib/providers/`), plus `MissingDarwinTokenError` (uk-darwin.js) which is an ops failure, not a rider message.

## Fix
1. **Structured error, not prose.** Give every `*FeedUnconfirmedError` a shared shape via a small base in `lib/providers/contract.js` (or a helper): `code: "FEED_UNCONFIRMED"`, `agency` (e.g. "Manchester Metrolink"), `station`, `alternative` (one short rider sentence, optional, e.g. "National Rail stations in Manchester still show live times."). Keep the long pipeline explanation in the error's `detail` and the file header, not in `message`.
2. **`api/board.js`:** map `code === "FEED_UNCONFIRMED"` to `503 { error: <rider message>, code: "FEED_UNCONFIRMED", agency, station }` where the rider message is built server-side:
   `Live times for <agency> aren't available yet, so <station>'s board can't be shown.` + (alternative ? ` ${alternative}` : ""). `MissingDarwinTokenError` → `503 { error: "Live times are temporarily unavailable — please try again shortly.", code: "PROVIDER_UNAVAILABLE" }`. Anything else keeps today's 500 but with `error: "Could not load departures for this station"` and the raw message only in a `detail` field — never doc paths or agent names in `error`.
3. **Client:** nothing should change if the server sends rider copy, but add a guard in the shared error-message helper (`locationErrorFrom` / the `setNearbyError` call sites): if a message contains `docs/`, `.md`, `GTFS`, or is longer than 160 chars, replace it with "Could not load departures for this station" and `console.warn` the original. That stops the next provider from leaking too.
4. **Picker hint (Tim to decide — build it behind the same data, keep it small):** in the station combobox, stops whose mode has no live feed (Metrolink, NET, T&W Metro, Supertram, Subway — derive from the catalog entry's `mode` plus a per-region `noLiveModes` list in the region config, not from string matching) show a trailing "no live times yet" tag. Do not remove them from the picker; the walk-up rule keeps them listed with an explicit verdict.

## Acceptance
1. `GET /api/board?city=greater-manchester&station=Altrincham` returns 503 with the rider message above and `code: "FEED_UNCONFIRMED"`; same for a NET stop in east-midlands, a Metro stop in north-east, a Supertram stop in south-yorkshire, a Subway stop in glasgow. Add these cases to a new `qa/feed-unconfirmed-rider-copy.mjs` (smoke tier) that also asserts no response `error` string anywhere in those calls contains `docs/`, `.md`, `Jim`, `Nico`, `Luke`, `Mark`, or `GTFS`.
2. Near me on Altrincham shows the rider message in the hero and offers the station picker; the existing dogfood gates for these regions still pass (they assert the error *type* surfaces — keep `error.name` and `code` intact).
3. `node qa/run-all.mjs --smoke` green; `/api/next-train` shape unchanged.

## Out of scope
Actually sourcing a Metrolink/NET/Metro feed (separate tracker rows); removing stops from catalogs.
