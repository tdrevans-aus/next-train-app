# Lausanne hazard pack (H1–H7)

Evidence: `docs/lausanne-d1/oracle-clash-report.md` (Nico, 2026-09-06), including its "Station
roster (D1 transcription, 6 Sep 2026)" section, which hand-transcribed the M1 and M2 station
lists from French Wikipedia (Ligne M1 / Ligne M2 du métro de Lausanne) cross-referenced against
English Wikipedia and the official TL map (t-l.ch/en/maps). Product `lib/cities/lausanne/`
absent. `assertCityLive("lausanne")` is Unknown city.

Unlike the Zürich pack in this same wave, the oracle report itself already did the station-level
transcription (both lines' ordered rosters, termini, shared/interchange stations) — so this pack's
`published-network.json` **is** a full station graph, not roster-only. No further web-fetch was
needed or attempted here; this Luke pass only reshapes what the oracle report already transcribed
into the D1 pack format, and adds nothing not present in that report.

## H1 — parent + child / doNotGroup

D1 has no stopIds. Three doNotGroup pairs, all named explicitly in the oracle report's C2/C3
section:

- **Lausanne-Flon (TL metro M1 × M2) vs LEB Lausanne–Échallens–Bercher R20** — same building,
  separate operator (TL vs LEB), separate platform level (LEB is on a lower level). LEB R20 is
  walk-up boardable and `in` on the board-eligibility table, but it is a distinct service with its
  own route identifiers — never merge into the metro board at Flon.
- **Lausanne-Gare (TL metro M2 only) vs CFF/SBB mainline** — shared address/building, separate
  platforms. CFF regional trains here are walk-up boardable and `in` on the board-eligibility
  table; SBB S-Bahn/long-distance is `out-mode` by the v1 metro-only cut. Metro and CFF must stay
  on separate boards regardless of eligibility overlap.
- **Renens-Gare (TL metro M1 only) vs CFF/SBB regional** — same shape as Lausanne-Gare: shared
  address, separate platforms, CFF walk-up boardable and `in`, S-Bahn `out-mode`.

## H2 — who has line codes today

Restating the oracle report's H2 table:

| surface | M1/M2 line codes? | what it actually has |
| --- | --- | --- |
| TL official map / t-l.ch | yes | M1 (15 stations) + M2 (14 stations); M3 announced, not open. S-Bahn + buses on separate map layers. |
| opentransportdata.swiss GTFS | yes (with filter) | Switzerland national feed; must filter agency=TL, route_type=0/1 to avoid S-Bahn/bus/LEB bleed. |
| Transitland `f-u0-switzerland` | yes (with filter) | Full Switzerland feed; same filtering requirement. |
| GTFS-RT protobuf | yes (with filter) | Same mixed stream (TL metro + LEB + S-Bahn + buses); filter per trip. |
| Wikipedia: Ligne M1 / Ligne M2 du métro de Lausanne (FR), cross-referenced EN | yes | Current ordered station rosters, termini, opening dates — this is the source hand-transcribed into this pack's `stations[]`/`termini`. |
| Product `lib/cities/lausanne/` | absent | No lausanne stations.json / line-map.json yet. |

## H3 — thin / overlay / out of scope

- **M3** — infrastructure concession approved June 2026, building permits pending, no confirmed
  construction start or opening date. Out until officially open. Not inserted; no station rows for
  Central Station–Blécherette invented.
- **S-Bahn / SBB regional-mainline services** — `out-mode`, excluded by the v1 metro-only cut, not
  by a boarding-contract failure (board-eligibility table records these as walk-up boardable but
  out by mode).
- **LEB commuter rail (beyond the board-eligibility verdict)** — in board eligibility as `in`, but
  not integrated as a metro line; no LEB stations/route in `published-network.json`'s `lines[]`.
- **Buses** — external to metro, out of v1.
- **Funicular** — minor accessory mode per oracle report, out of v1.

## H4 — hub-lock choice + branches

**Locked: Lausanne-Flon.** Only station where M1 and M2 both call — verified on the official TL
map as the printed M1–M2 crossing. Task instruction confirms this lock explicitly.

| node | branches | evidence |
| --- | --- | --- |
| Lausanne-Flon | M1 eastern terminus × M2 (calls between Grancy and Riponne-Maurice-Béjart). Hub lock. Not a direction token. Also hosts LEB R20 on a separate lower platform (doNotGroup, H1). | Oracle report hub-lock section; station roster interchange note |
| Lausanne-Gare | M2 only (station 5 of 14). doNotGroup vs CFF/SBB mainline (H1). Considered and rejected as an alternative hub — oracle report: "not a true hub for metro, so not locked." | Oracle report "Potential secondary choice" note |
| Renens-Gare | M1 western terminus. doNotGroup vs CFF/SBB regional (H1). | Oracle report station roster + skip-risk section |

No other branch/fork points are named in the oracle report — M1 and M2 are each reported as
single linear lines (terminus to terminus), consistent with the "Line + terminus" direction model
recommended below.

## H5 — nested short turns

Not sourced either way. The oracle report's station roster and skip-risk section describe a
locked, stable 28-station roster with "no temporary construction lines or seasonal roster shifts
documented," but it never explicitly rules out peak-only short-workings on M1 or M2. `shortTurns`
is left as `[]` on both lines in `published-network.json` — treat this as **not checked**, not as
"verified none," per the same caution the Zürich pack flags for H5.

## H6 — inner city (where §3 lives)

Locked hub: **Lausanne-Flon**. M1 (eastern terminus) × M2 (mid-line call, between Grancy and
Riponne-Maurice-Béjart) intersect here — the only station on both metro lines. LEB R20 calls on a
separate lower platform (doNotGroup, H1); not a second metro line at this hub. Lausanne-Flon is a
hub *stop string*, never a direction token — same rule as every other city's hub lock in this
pipeline (Arts-Loi/Kunst-Wet in Brussels, Bellevue in Zürich).

Lausanne-Gare (M2 only, also CFF/SBB) was considered and explicitly rejected as a hub by the
oracle report ("not a true hub for metro, so not locked").

## H7 — DST

**Europe/Zurich HAS DST** (UTC+1 standard / UTC+2 summer, last Sunday March – last Sunday
October) — Lausanne shares Switzerland's national timezone with Zürich. Do not copy Perth/
Brisbane no-DST assumptions into this city.

## Licence — flagged for Tim, not resolved here

opentransportdata.swiss Terms of Use has **no named licence** (not CC BY, not CC0, not ODbL) —
"Open Data" platform language only. Terms require attribution ("cite opentransportdata.swiss as
the source") and regular republishing of updated data, but do **not** explicitly address
third-party redistribution to end users of a commercial app. Oracle report's own confidence
rating: `unclear` (same wording as the Zürich pack, same underlying feed). **This pack does not
resolve that ambiguity — it is Tim's call, recorded here as a hazard, not guessed at.** Do not
build/ship a Lausanne adapter against this feed until Tim signs off on the redistribution
question.

## Feed auth — flagged for Tim, not resolved here

GTFS-RT (`https://api.opentransportdata.swiss/la/gtfs-rt`) requires a **Bearer API key**, 401
without one, registered via https://api-manager.opentransportdata.swiss/. Key is **personal and
non-transferable** per SBB terms. Rate limit **2 queries per minute** (sliding window) — the same
tight limit flagged in the Zürich pack, since both cities share the national opentransportdata.swiss
feed; this is a real product-shape constraint (caching strategy, single shared poller vs
per-tester load) that Jim/Tim need to plan around, not something this pack resolves. **Never
paste a key.** This pack contains no key and made no live calls.

## What I did not do

No live web fetch of the TL official map, Wikipedia, or opentransportdata.swiss (station roster
was already hand-transcribed into the oracle report by Nico; this pack reshapes that transcription,
it does not independently re-verify it against a live source). No GTFS-derived station arrays
(oracle report explicitly says not to generate `published-network.json` from GTFS). No stopIds. No
M3 station rows. No LEB/CFF/S-Bahn route integration beyond the board-eligibility carry-over and
the doNotGroup notes above. No live city flip, no product edit, no `lib/providers/` or
`registry.js` edit (Jim's job). No resolution of the licence-confidence or Bearer-key/rate-limit
hazards — both recorded for Tim, not decided here.
