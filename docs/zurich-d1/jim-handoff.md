Zürich D1 + research pack (Luke), 2026-09-06. City stays **planned**. Existing live/planned cities
untouched. `assertCityLive("zurich")` must still fail (city not in `lib/providers/registry.js`
today). No generator committed, no PR, no product edit, no `lib/providers/` or `registry.js` edit.

**Do not build the Zürich adapter from this pack yet — a station graph does not exist.** This is
not a "supervised session" caveat like Copenhagen's; it's a hard blocker: `published-network.json`
in this pack is **roster-only** (line numbers, hub lock, doNotGroup) with every line's
`stations[]`/`termini[]` empty. No web-fetch tool was available to this Luke invocation to open the
official ZVV/VBZ tram map or the "Trams in Zurich" Wikipedia page that the oracle report named as
D1 sources, so no hand-transcription happened. A follow-up Nico or Luke pass with a working
web-fetch tool needs to do that transcription before D2 (Jim's adapter) or D5 (assertion tables) can
proceed. See hazard-pack.md header and direction-model-memo.md for the full explanation.

Pack files: `docs/zurich-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=zurich**, single-operator v1: VBZ (Verkehrsbetriebe Zürich) tram only, within ZVV. Not
  `city=zh`, `city=zrh`, `city=vbz`. Do not merge into another Swiss city.
- **Modes v1: VBZ tram only.** No S-Bahn, no buses, no boats, no funicular, no metro (none exists).
  Construction lines 50/51 (Bahnhofquai renovation) excluded from the passenger roster.
- **Passenger tram line roster (14 lines, per oracle report):** 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13,
  14, 15, 17.
- **Hub lock: Bellevue** — chosen because Zürich HB (tram) is under renovation (Bahnhofquai works,
  Dec 2025–2026) with an unstable line roster during that period. Bellevue's reported line set (2,
  4, 5, 8, 9, 15) is smaller and stable. Bellevue is a hub stop string, never a direction token.
- **doNotGroup SBB Zürich HB vs VBZ Zürich HB tram** — shared address, separate platforms; SBB is
  out of v1 scope entirely by the tram-only mode cut and must never be merged into a tram board.
  Same shape at Stadelhofen and Wiedikon (VBZ tram in scope, SBB out).
- **Europe/Zurich HAS DST.**
- **Board eligibility**: oracle report's table already covers this (all VBZ tram `in`; S-Bahn/bus/
  boat `out-mode`) — no board-eligibility work needed from this pack, no silent omissions.

## What is NOT solid — resolve before D2, don't wire around

1. **No station graph exists.** `stations[]`/`termini[]` are empty on every line in
   `published-network.json`. This is the single biggest blocker — do not attempt to build a
   `line-map.json` or station list for the adapter from anything other than a properly sourced
   transcription pass. Do not use GTFS to generate it either (oracle report explicitly says not to).
2. **Licence confidence is `unclear`.** opentransportdata.swiss Terms of Use has no named licence
   (not CC BY, not CC0, not ODbL); attribution is required but third-party redistribution to end
   users of a commercial app is not explicitly addressed. **Get Tim's sign-off before building or
   shipping a live adapter against this feed** — see hazard-pack.md.
3. **Bearer API key + tight rate limit.** GTFS-RT requires a Bearer key (401 without one),
   registered via the API Manager, personal/non-transferable, rate-limited to **2 queries per
   minute** per key. This is a real product-shape constraint (single shared poller vs per-tester
   load, caching strategy) that needs planning before D2, not just a credential to paste in. Never
   paste a key into any file in this repo.
4. **Bellevue's exact line set (2, 4, 5, 8, 9, 15) is narrative-only** in the oracle report — no
   direct official-map citation attached to that specific list. Re-confirm once the transcription
   pass happens.
5. **Whether any line is a loop/ring rather than linear** is unchecked. Default assumption (line +
   terminus, like most other city packs) is unverified — see direction-model-memo.md.
6. **Short turns unchecked** — not confirmed either way, don't assume none exist.
7. **Feed composition**: opentransportdata.swiss GTFS-RT mixes VBZ tram + S-Bahn + buses on one
   protobuf stream. Adapter filtering (`agency=VBZ`, `route_type=0`) must be tight to avoid S-Bahn/
   bus bleed onto tram boards — flagged, not yet implementable without D2 work.

## Direction model (full detail: direction-model-memo.md)

Provisional recommendation only, pending the station-graph follow-up: **line + terminus** (e.g.
`2 + <terminus>`), matching every other city pack in this pipeline — but no termini are sourced yet.
Bellevue is the hub lock and must never appear as a direction token.

## What I did not do

No web fetch of the official ZVV/VBZ tram map or the "Trams in Zurich" Wikipedia page (no
web-capable tool available in this invocation). No station-by-station hand transcription, no line
termini, no branch points, no short-turn table, no stopIds. No GTFS-derived station arrays. No
generator, no assertion tables, no live city flip, no product edit, no `lib/providers/` or
`registry.js` edit (Jim's job). No resolution of the licence-confidence or Bearer-key/rate-limit
hazards (both flagged for Tim, not decided here). No lane-lock action taken — Luke needs no check
per `CLAUDE.md`, and this pack's whole write set is `docs/zurich-d1/`.

## Recommended next step

A follow-up Nico or Luke invocation with a working web-fetch tool should hand-transcribe the VBZ
tram station graph from the official ZVV/VBZ map or the "Trams in Zurich" Wikipedia page (same
pattern as the Copenhagen pack's second pass), then this pack's `published-network.json` and
`direction-model-memo.md` can be completed with real stations/termini/branches, and D2/D5 work can
begin — contingent on Tim's licence sign-off for the live-feed side.
