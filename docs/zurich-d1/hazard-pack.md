# Zürich hazard pack (H1–H7)

Evidence: `docs/zurich-d1/oracle-clash-report.md` (Nico, 2026-09-06). Product `lib/cities/zurich/`
absent. `assertCityLive("zurich")` is Unknown city.

**Read this first: no station-level hand-transcription was possible in this pass.** The oracle
report says (correctly) "D1 is the official VBZ tram map, hand-transcribed (this pack)" — but this
Luke invocation has no web-fetch tool available in its toolset (Read/Grep/Glob/Write/Edit/Bash
only, no browser/fetch), so the official ZVV/VBZ map and the "Trams in Zurich" Wikipedia page named
in the oracle report as D1 sources could not actually be opened and transcribed here, unlike the
Copenhagen pack (which did have live web access and used it to transcribe Wikipedia's station
tables against the oracle report's named sources). This is flagged as a gap for the next
Nico/Luke pass, not inferred or guessed. `published-network.json` in this pack is therefore
**roster-only** (line numbers, hub lock, doNotGroup) with empty `stations[]`/`termini[]` per line —
see that file's `notes` and `coverageGaps`.

## H1 — parent + child / doNotGroup

D1 has no stopIds. **doNotGroup SBB Zürich HB vs VBZ Zürich HB tram**: shared address
(Hauptbahnhof), separate platforms/areas — SBB mainline + S-Bahn is out of v1 scope entirely (tram
only), and even as a transfer note it must never be merged into a single tram board. Same doNotGroup
shape recurs at **Stadelhofen** (VBZ tram lines 2, 4, 5 per Wikipedia + SBB rail) and **Wiedikon**
(VBZ tram + SBB) — SBB excluded at both by the v1 mode cut, not merged.

## H2 — who has line codes today

Restating the oracle report's H2 table (not re-verified against a live source in this pass):

| surface | tram lines? | what it actually has |
| --- | --- | --- |
| ZVV official maps / VBZ website | yes | VBZ tram lines 2–15 (excluding 1, 12, 16) + S-Bahn + bus |
| opentransportdata.swiss GTFS | yes (with filter) | Switzerland national feed; must filter route_type=0 (tram) + agency=VBZ |
| Transitland `f-u0-switzerland` | yes (with filter) | Full Switzerland feed; same filtering requirement |
| GTFS-RT protobuf | yes (with filter) | Same mixed stream; filter per trip on VBZ agency |
| Wikipedia: Trams in Zurich | yes | Current line roster, routes, terminals — **named as a D1 source but not opened/transcribed in this pass** (see header above) |
| Product `lib/cities/zurich/` | absent | No zurich stations.json / line-map.json |

## H3 — thin / overlay / out of scope

- **S-Bahn (SBB regional/commuter)**: out-mode, v1 is tram only.
- **Buses (VBZ + external operators)**: out-mode.
- **Boats (Lake Zürich ferries)**: out-mode.
- **Funicular**: out-mode (minor accessory mode per oracle report).
- **Construction lines 50, 51** (Bahnhofquai renovation, Dec 2025–2026): out of the v1 passenger
  roster per the oracle report's own framing ("v1 scope is the published passenger-facing line
  roster ... not every construction line"). Not inserted.

## H4 — hub-lock choice (not a branch table — no sourced branch topology yet)

The oracle report offers two hub candidates and leaves the choice to the transcriber:

| candidate | lines (as reported) | note |
| --- | --- | --- |
| **Bellevue (chosen)** | 2, 4, 5, 8, 9, 15 | Smaller, stable roster; not under renovation. **Locked for this pack per explicit task instruction: hub lock Bellevue (Zürich HB tram is under renovation).** |
| Zürich HB (tram), not chosen | 3, 4, 6, 7, 10, 11, 13, 14, 17, 50, 51 | Larger roster but Bahnhofquai renovation Dec 2025–2026 makes the exact call-point set a moving target; also the site of the SBB doNotGroup (H1). Rejected as the lock for that instability, kept only as an alternative note. |

No branch points, shared trunks, or short-turn stations are sourced for either hub in this pass —
that requires the station-level transcription flagged in the header. Do not invent branch rows.

## H5 — nested short turns

Not sourced. The oracle report does not name any nested short-turn codes (nothing like Adelaide's
GAW/SALIS or Brussels' loop ends), and no station-by-station transcription was done to check for
unofficial short-turns either. Flag for the follow-up transcription pass — do not assume
`shortTurns: []` means "verified none," it means "not checked."

## H6 — inner city (where §3 lives)

Locked hub: **Bellevue**. Lines 2, 4, 5, 8, 9, 15 per the oracle report (not independently
re-verified against a live map in this pass). No co-located SBB station at Bellevue — tram only,
per the oracle report. Bellevue is a hub *stop string*, not a direction token (same rule as every
other city's hub lock in this pipeline).

Zürich HB (tram) is **not** the lock — kept only as the documented alternative, rejected for
renovation-driven instability (see H4). SBB Zürich HB is out-of-scope by mode cut and additionally
doNotGroup'd against the VBZ tram stop of the same name (H1).

## H7 — DST

**Europe/Zurich HAS DST** (UTC+1 standard / UTC+2 summer, last Sunday March–last Sunday October).
Do not copy Perth/Brisbane no-DST assumptions into this city.

## Licence — flagged for Tim, not resolved here

opentransportdata.swiss Terms of Use has **no named licence** (not CC BY, not CC0, not ODbL) —
"Open Data" platform language only. Terms require attribution ("cite opentransportdata.swiss as the
source") and regular republishing of updated data, but do **not** explicitly address third-party
redistribution to end users of a commercial app. Oracle report's own confidence rating: `unclear`.
**This pack does not resolve that ambiguity — it is Tim's call, recorded here as a hazard, not
guessed at.** Do not build/ship a Zürich adapter against this feed until Tim signs off on the
redistribution question.

## Feed auth — flagged for Tim, not resolved here

GTFS-RT (`https://api.opentransportdata.swiss/la/gtfs-rt`) requires a **Bearer API key**, 401
without one, registered via https://api-manager.opentransportdata.swiss/. Key is **personal and
non-transferable** per SBB terms. Rate limit **2 queries per minute** (sliding window) — very tight
for a live board product; this is a real product-shape constraint (caching strategy, single shared
poller vs per-tester load) that Jim/Tim need to plan around, not something this pack can resolve.
**Never paste a key.** This pack contains no key and made no live calls.

## What I did not do

No web fetch of the official ZVV/VBZ tram map or the "Trams in Zurich" Wikipedia page (no
web-capable tool available in this invocation — flagged above, not silently skipped). No
station-by-station hand transcription. No line termini, no branch points, no short-turn table, no
stopIds. No GTFS-derived station arrays (also disallowed by the oracle report). No generator, no
assertion tables, no live city flip, no product edit, no `lib/providers/` or `registry.js` edit
(Jim's job). No resolution of the licence-confidence or Bearer-key hazards above — both are recorded
for Tim, not decided here.
