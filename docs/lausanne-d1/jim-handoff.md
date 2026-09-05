Lausanne D1 pack (Luke), 2026-09-06. City stays **planned**. Existing live/planned cities
untouched (Zürich is a separate, unrelated pack in this same wave — do not merge). No generator,
no PR, no product edit, no `lib/providers/` or `registry.js` edit. `assertCityLive("lausanne")`
must still fail (city not in `lib/providers/registry.js` today — Unknown city / 400).

Pack files: `docs/lausanne-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

**Unlike the Zürich pack, this one has a full station graph.** The oracle report's own "Station
roster (D1 transcription, 6 Sep 2026)" section already hand-transcribed both lines from French
Wikipedia (cross-referenced against English Wikipedia and the official t-l.ch map) before this
Luke pass started — this pack reshapes that transcription into D1 pack format; it does not
independently re-verify it against a live source. D2 (adapter) and D5 (assertion tables) can
proceed from this station graph once the licence/auth hazards below are cleared by Tim.

## What's solid (cite: hazard-pack.md, direction-model-memo.md)

- **city=lausanne**, single-operator v1: TL (Transports publics de la région lausannoise) metro
  only. Not `city=laus`, `city=lsn`, `city=vd`. Do not merge into another Swiss city (Zürich is
  separate).
- **Modes v1: TL Métro M1 + M2 only.** No M3 (concession approved, permits pending, no start
  date), no S-Bahn, no buses, no funicular, no LEB-as-a-line.
- **Full station roster, 28 stations total:** M1 = 15 stations (Lausanne-Flon – Renens-Gare). M2 =
  14 stations (Ouchy-Olympique – Croisettes). Lausanne-Flon shared between both.
- **Hub lock: Lausanne-Flon** — the only station where M1 and M2 both call (M1 eastern terminus;
  M2 mid-line call). Verified against the official TL map per the oracle report. Never a direction
  token.
- **doNotGroup Lausanne-Flon metro vs LEB R20** (separate operator, separate lower platform).
- **doNotGroup Lausanne-Gare (M2) vs CFF/SBB mainline** (shared address, separate platforms).
- **doNotGroup Renens-Gare (M1) vs CFF/SBB regional** (shared address, separate platforms).
- **Europe/Zurich HAS DST** (same timezone as Zürich).
- **Board eligibility**: oracle report's table already covers this (M1/M2 all `in`; LEB R20 at
  Flon `in`; CFF regional at Lausanne-Gare/Renens-Gare `in`; S-Bahn and buses `out-mode`) — no
  further board-eligibility work needed from this pack, no silent omissions.

## What is NOT solid — resolve before D2, don't wire around

1. **Licence confidence is `unclear`.** opentransportdata.swiss Terms of Use has no named licence;
   attribution required, third-party redistribution to end users of a commercial app not
   explicitly addressed — same hazard as the Zürich pack (same feed). **Get Tim's sign-off before
   building or shipping a live adapter against this feed.**
2. **Bearer API key + tight rate limit.** GTFS-RT requires a Bearer key (401 without one), 2
   queries/minute per key. Real product-shape constraint (single shared poller vs per-tester
   load), needs planning before D2. Never paste a key.
3. **Short turns unchecked** on both M1 and M2 — not confirmed either way; `shortTurns: []` in
   `published-network.json` means unchecked, not verified-empty.
4. **Printed line-token convention (M1/M2 vs bare number vs "Métro 1")** not independently checked
   against a live map render in this pass — assumed `M1`/`M2` per the oracle report's own naming.
5. **Feed composition**: opentransportdata.swiss GTFS-RT mixes TL metro + LEB + S-Bahn + buses on
   one protobuf stream. Adapter filtering (`agency=TL`, `route_type=0/1`) must be tight to avoid
   S-Bahn/LEB/bus bleed onto metro boards.

## Direction model (full detail: direction-model-memo.md)

**Line + terminus** (e.g. `M1 + Renens-Gare`, `M2 + Croisettes`), matching every other city pack in
this pipeline. Lausanne-Flon is the hub lock and must never appear as a generic direction token
(it is only a valid label on M1, where it is genuinely a terminus).

## What I did not do

No live web fetch of the TL map, Wikipedia, or opentransportdata.swiss in this pass — the oracle
report's own station-roster section already did the hand-transcription; this pack reshapes it
into D1 format without independently re-verifying it against a live source. No GTFS-derived station
arrays (disallowed by the oracle report). No stopIds. No M3 station rows. No LEB/CFF/S-Bahn route
integration beyond the board-eligibility carry-over and doNotGroup notes. No generator, no
assertion tables, no live city flip, no product edit, no `lib/providers/` or `registry.js` edit
(Jim's job). No resolution of the licence-confidence or Bearer-key/rate-limit hazards (both
flagged for Tim, not decided here). No lane-lock action taken — Luke needs no check per
`CLAUDE.md`, and this pack's whole write set is `docs/lausanne-d1/`.

## Recommended next step

Tim signs off on the opentransportdata.swiss licence-redistribution question (shared with Zürich).
Once cleared, Jim can build the adapter (D2) directly from this pack's `published-network.json`
station graph — no further Nico/Luke transcription pass is needed for M1/M2, unlike Zürich.
