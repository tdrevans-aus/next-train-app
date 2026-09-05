Vienna D1 + research pack (Luke), 6 Sep 2026. City stays **planned**. Existing live/planned
cities untouched. `assertCityLive("vienna")` must still fail (city not in
`lib/providers/registry.js` today). No generator committed, no PR, no product edit, no
`lib/providers/` or `registry.js` edit.

Pack files: `docs/vienna-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=vienna**, single-operator v1: Wiener Linien GmbH, U-Bahn heavy metro only (U1, U2, U3,
  U4, U6 — U5 excluded, service opens 2030). Not `city=wien`, not `city=at-vienna`. No Austria
  country-lane ledger exists or is needed (single-region country).
- **Hub lock: Karlsplatz** (U1 × U2 × U4). Confirmed from all five line articles' own ordered
  station lists. **U1 and U4 pass through Karlsplatz; U2 terminates there** — this is a different
  hub shape from every prior pack (Brussels' Arts-Loi/Kunst-Wet and Copenhagen's Kongens Nytorv
  are both pure through-crosses, no line terminates at either). See direction-model-memo.md
  section 2 for how this changes U2's direction chip at Karlsplatz (only one live outbound
  direction there, not two).
- **Station graph for all five lines (99 unique stations) is hand-transcribed from each line's own
  ordered Wikipedia "Stations" section** (`U1 (Vienna U-Bahn)` through `U6 (Vienna U-Bahn)`,
  terminus to terminus), cross-checked against the alphabetical master station-list table's Lines
  column for membership and total-count verification two independent ways. All five lines are
  **linear** — no ring, no branch, confirmed by every line article.
- **Station-count correction against the oracle report (hazard-pack.md H2, evidence-backed):**
  actual per-line counts are **U1=24, U2=21, U3=21, U4=20, U6=24** (oracle report claimed
  28/20/20/19/22). Actual **unique station total is 99, not ~109** — ten stations are two-or-
  three-line interchanges (Karlsplatz is a triple; nine others are two-line pairs: Praterstern,
  Stephansplatz, Volkstheater, Schottenring, Schwedenplatz, Landstraße, Westbahnhof,
  Längenfeldgasse, Spittelau). **Use the counts and station arrays in `published-network.json`,
  not the oracle report's C2/C3 figures.**
- **Ten interchange stations, all same-operator/same-mode** (no doNotGroup needed for competing-
  operator conflation, unlike Copenhagen/Brussels) — full list and per-station line pairing in
  hazard-pack.md H1/H4 and mirrored in each line's `branches[]` array in
  `published-network.json`.
- **License: CC BY 4.0** per the oracle report (Vienna Open Government Data portal / Wiener
  Linien OGD publication). Attribution required, commercial reuse permitted. Not re-verified in
  this pass — the oracle report's license table is treated as settled.
- **Europe/Vienna HAS DST.**

## What is still NOT solid — resolve before/at D2, don't wire around

1. **"Schedifkaplatz"** — the oracle report's Board eligibility table names this as a U6 ×
   Badner Bahn interchange, but **no primary source pulled for this pack confirms the name** (not
   in the U6 line article's ordered station list, not in the alphabetical master table). Doesn't
   change v1 scope (Badner Bahn is `out-product` regardless of which station name is correct), but
   if Jim's D2 pass or a later station-graph check finds the real name, that's new information
   this pack didn't have — see hazard-pack.md H3.
2. **No nested short-turn codes found at D1** for any of the five lines (hazard-pack.md H5) — but
   this was checked against Wikipedia's per-line prose only, not GTFS trip patterns or the live
   OGD Monitor feed. If Jim's D2 timetable pass finds peak-only/partial-route U-Bahn services,
   that's new information, not assumed here.
3. **Real-time feed is proprietary JSON (OGD Monitor), not GTFS-RT** —
   https://www.wienerlinien.at/ogd_realtime/monitor (no key; remove/ignore the `SENDER` parameter
   per the official docs). Do not assume the shared `gtfs/realtime-board.js` path works unmodified
   — this needs its own parsing path, per the oracle report's H2. Community GTFS-RT bridge
   projects exist but are unofficial and were not evaluated here.
4. **U2's single-direction chip at Karlsplatz** (direction-model-memo.md section 2, open question
   1) — flagged for Tim to confirm the "only one live direction, not two" framing before D5
   assertion tables are written.

## Direction model (full detail: direction-model-memo.md)

- **All five lines**: line + terminus, e.g. `U1 + Leopoldau`, `U6 + Siebenhirten`. No ring
  topology exists (unlike Copenhagen's M3 or Brussels' inner loop) — don't reuse either recipe.
- **Karlsplatz**: U1 and U4 render the ordinary two-direction chip pair each; **U2 renders only
  one direction** (`U2 + Seestadt`) since Karlsplatz is U2's own terminus, not a through-station
  for it. Karlsplatz itself is never a direction token.
- **Nine two-line interchange stations** (Praterstern, Stephansplatz, Volkstheater, Schottenring,
  Schwedenplatz, Landstraße, Westbahnhof, Längenfeldgasse, Spittelau): both lines are through-
  stations there, ordinary line + terminus chips on each, no special handling needed.
- No service-type/destination-only chips needed anywhere in v1 scope — all five lines have a
  single, stable, printed passenger-facing code (unlike Copenhagen's DSB Regional/InterCity or
  Brussels' premetro naming questions).

## What I did not do

No live flip, no UI wiring, no D5 assertion tables, no adapter code, no `lib/providers/` or
`registry.js` edit, no live fetch of the official Wiener Linien PDF network map (used the five
Wikipedia line articles' own ordered station lists plus the alphabetical master table as the
checkable D1 source instead, per hazard-pack.md), no GTFS fetch (oracle report's H2 explicitly
says do not generate `published-network.json` from GTFS), no U5 station-graph work (out of v1
scope, service opens 2030), no resolution of the "Schedifkaplatz" naming gap (flagged, not
decided), no wiring of the proprietary OGD Realtime Monitor JSON schema, no edits to any other
city's pack.

## Lane status

Luke needs no lane-lock check (per CLAUDE.md: "Luke needs no check" — his whole write set is
`docs/vienna-d1/`, which no other lane touches). The pack is complete by the shape of every other
`docs/<city>-d1/` folder (4 files) and every claim in it is sourced. **The adapter build is
intentionally NOT started** — that's Jim's job (D2–D6), not this pack's.

---

## Jim → Mark note (adapter wired, 6 Sep 2026)

`lib/providers/vienna.js` + `lib/cities/vienna/{stations.json,marketing-directions.js}` wired.
Registry entry `status: "planned"`, `adapterReady: true` — **not** flipped live; that stays
Tim/Mark's call. `assertCityLive("vienna")` still returns 501 (verified in
`qa/vienna-planned-gate.mjs`, registered in `qa/run-all.mjs`'s smoke tier).

- **Standalone adapter, not a shared-provider config.** Wiener Linien is Vienna's own agency
  with no other Next Train city on the same feed, so this follows the Adelaide/Perth/Boston
  storage pattern (`loadGtfsStatic({url})` over a committed catalog object,
  `lib/cities/vienna/stations.json`) rather than the config-over-shared-provider shape used for
  Copenhagen/UK-Darwin regions. Austria has no country-lane ledger (single-region country).
- **99-station catalog** generated directly from `published-network.json`'s per-line
  `stations[]` arrays (union across all five lines, order preserved from each line's own
  transcription) — not hand-retyped, to avoid introducing a fresh transcription error on top of
  the pack's own H2 correction. Confirmed programmatically: exactly 99 unique names, exactly the
  ten interchange stations named in hazard-pack.md H1 (Karlsplatz as a triple; the other nine as
  pairs), matching the pack's stats exactly.
- **Karlsplatz hub lock implemented as documented, including its unusual shape.** U1 and U4 get
  the ordinary two-terminus chip set. **U2's `LINE_TERMINI` deliberately excludes Karlsplatz** —
  only `U2 + Seestadt` is ever synthesized anywhere in the network, per direction-model-memo.md
  section 2. This is a real behavioural difference from Boston/Copenhagen's hub locks (both pure
  through-crosses) and is covered by an explicit gate assertion
  (`mapLineTerminusDestination("Karlsplatz", "u2") === "U2"`, never `"U2 + Karlsplatz"`).
- **Kaisermühlen-VIC** locked as the canonical name (station's own Wikipedia article title,
  matches the U1 line article), with `Kaisermühlen` (the alphabetical master table's truncated
  form) as its only alias — resolves correctly in the gate.
- **Route classification**: GTFS `route_type` "1" (subway/metro) as a first-pass filter, then
  exact `route_id` match (U1/U2/U3/U4/U6) via the trip table, same two-layer shape as
  `lib/providers/boston.js`. **Unverified against a live GTFS payload** — no GTFS pull was
  performed at D1 (the oracle report's H2 explicitly says not to generate
  `published-network.json` from GTFS), so confirm both the route_type value and the exact
  route_id strings against a real pull before any live flip.
- **Two non-blocking D1 flags carried forward, not resolved here** (also tracked in
  `docs/expansion-tracker/pack-readiness-2026-09-06.md`): (1) the oracle report's claimed
  "Schedifkaplatz" (U6 x Badner Bahn interchange) is unverified against any primary source
  pulled for this pack — doesn't change v1 scope since Badner Bahn is out-product regardless;
  (2) no nested short-turn codes were found at D1, but only against Wikipedia prose, not GTFS
  trip patterns — a genuine D2 timetable-pass item, not assumed resolved by this wiring pass.
- **Real-time is explicitly NOT wired.** The official Wiener Linien OGD Realtime Monitor
  (`https://www.wienerlinien.at/ogd_realtime/monitor`, no key) is a **proprietary JSON schema,
  not GTFS-RT protobuf** (jim-handoff.md item 3 / hazard-pack.md H2-H3) — it cannot be handed to
  the shared `gtfs/realtime-board.js` path unmodified and needs its own parsing/mapping layer,
  which is a genuine follow-up, not attempted here. `MissingViennaRealtimeMonitorError` is
  exported and documented in the `lib/providers/vienna.js` file header for whoever wires that
  path later — it is not thrown anywhere in the current code path (schedule-only GTFS static
  board, same posture as Copenhagen/Boston).
- **Follow-through NOT done, by design:** no dogfood module, no `live-city-api.js` dispatch
  wiring, no `*-dogfood-gate.mjs`. Per the current guardrails that bundle only happens once
  Mark's QA is green and the flip is imminent, and even then the `MULTI_CITY_IDS`/
  `brisbane-dogfood.js`/`journey-model.js` three-list additions get bundled into the actual
  status-flip commit, not before.
- **Open items for Tim, carried from D1, not resolved by Jim:** direction-model-memo.md's open
  question 1 (U2's single-direction chip at Karlsplatz — implemented as documented, but Tim's
  confirmation is still requested before D5 assertion tables are written) and open question 3
  ("Schedifkaplatz" naming gap).

No product edit, no Perth edit, no live flip, no merge of other PRs, no API key registered/
pasted, no other city's adapter touched.
