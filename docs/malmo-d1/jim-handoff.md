Malmö D1 + research pack — **second pass, 29 Aug 2026: per-line data filled in.** City stays
**planned** until Jim wires testers live. Existing live/planned cities untouched. Do not merge
malmo into goteborg or stockholm. **assertCityLive("malmo") must still fail** (city not in
`lib/providers/registry.js` today). No generator committed, no PR, no product edit. Do not flip
malmo live from this pack.

Pack files: `docs/malmo-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

The first pass was thin because the official map was egress-blocked. That block is gone: the
Skånetrafiken train map (Dec 2024) was obtained and the per-line structure was derived from the
official GTFS Sweden 3 feed cross-checked against it. `lines[]` is now populated (10 corridors,
ordered stops, termini, short-turns, ring double-call).

## What's solid (cite: oracle-clash-report.md)

- **city=malmo**, agency Skånetrafiken / Pågatågen. V1 = Pågatågen only (no light rail — closed
  1973; no bus; no Öresundståg; no Krösatågen).
- **Official D1 map in hand**: "Fler resmöjligheter med tåg", Uppdaterad december 2024, linked
  from skanetrafiken.se/kartor/ ("Tåglinjer i Skåne"), md5 `41387ef91e51a0009e99cde9c47dbf41`.
- **10 Pågatågen corridors** (reference numbers 2–11 incl. 4B; no 1, no 12), 6 of which serve
  Malmö (3, 6, 8, 9, 10, 11). Full ordered stops in `published-network.json`.
- **No passenger-facing line codes exist** — not on the map, site, or feed. The first pass's
  "H3/H4/E6" hedge and "11 lines + rush-hour line 12" claim are both withdrawn/corrected;
  the express is **PågatågenExpress** (Svågertorp–Hässleholm/–Älmhult, limited daily).
- **Hub lock: Malmö C** — and it is the network's one double-call station: line 11
  (Malmöpendeln/Malmöringen, Kävlinge–Lomma–Malmö C–Triangeln–Hyllie–Svågertorp–Persborg–
  Rosengård–Östervärn–Malmö C, both directions) calls it twice per through-path, with headsign
  "Malmö central" even outbound. Model like Oslo's Stortinget; see direction-model-memo.md.
- **doNotGroup Pågatågen vs Öresundståg at Malmö C, Triangeln, Hyllie, AND Burlöv** (map legend
  symbol confirmed).
- **Burlöv and Oxie confirmed in v1** (map symbol + current GTFS service).
- **Feed renames**: GTFS strings "Malmö Triangeln" / "Malmö Rosengård station" / "Malmö
  Centralstation" etc. vs printed "Triangeln" / "Rosengård" / "Malmö C" — rename table in the
  oracle report. Lock printed strings.
- **License: CC0 1.0** for both GTFS Sweden 3 and GTFS Regional (captured per
  nico-research-sources §2) — redistribution/commercial use unrestricted.
- **Europe/Stockholm HAS DST.**

## What is still NOT solid — resolve at D2, don't wire around

1. **Regional key scope.** The adapter path is Trafiklab GTFS Regional `skane`
   (static + TripUpdates + VehiclePositions + occupancy per Trafiklab's table), but the local
   `TRAFIKLAB_GTFS_SWEDEN_KEY`/`_RT_KEY` get **403 "Key does not have access to file"** on
   `gtfs/skane/skane.zip` and `gtfs-rt-sweden/skane/TripUpdatesSweden.pb`. The regional
   `TRAFIKLAB_API_KEY` is Vercel-only. Verify key scope before promising a live board.
   (RT catalog identity corrected: mdb-2970 = TripUpdates, 2971 = ServiceAlerts,
   2972 = VehiclePositions.)
2. **Line 3's Helsingborg end** (Gantofta–Ramlösa–Helsingborg C) is on the map and in the
   reference station count but didn't run through in the analysed GTFS week (engineering work
   plausible). Don't chip Gantofta as a terminus; confirm against the live feed.
3. **Ring chip copy.** "Malmöringen mot Triangeln/Östervärn" is recommended structure, not
   transcribed signage — platform display wording unverified. Tim signs off chip copy
   (direction-model-memo open questions 1–2).
4. **Short-turn lists are observed-indicative**, from one fragmented week — assert per-trip far
   ends from the live feed at D5, not a fixed list.
5. **GTFS parent/child shape at Malmö C** not catalogued — check `stops.txt`
   `location_type`/`parent_station` in the wired feed; do not assume single-row stops.

## Direction model

**Product + terminus ("Pågatågen mot `<far end>`"), Malmöringen special-cased with ring-side
tokens; never inbound/outbound, never raw headsigns** (self-referential "Malmö central" at
Malmö C). Worked §3 examples now exist in direction-model-memo.md.

## What I did not do

No `lib/providers/` or `registry.js` edit, no live flip, no UI wiring, no D5 assertion tables,
no Öresundståg/Krösatågen/bus scope creep, no rehosting of the Skånetrafiken PDF artwork, no
edits to any other city's pack.
