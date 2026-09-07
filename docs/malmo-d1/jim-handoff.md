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

**Update, 30 Aug 2026 (Tim's product decision, docs/board-eligibility-rule.md):** Öresundståg and
Krösatågen flip from "out of v1" to `in` — see oracle-clash-report.md's Board eligibility
section. `lib/providers/malmo.js`'s `tripAllowed()` now also accepts these two products via GTFS
`route_desc` (Skånetrafiken files them there, not under `route_long_name`); the "not v1"
statements below are historical and superseded by that section.

## What's solid (cite: oracle-clash-report.md)

- **city=malmo**, agency Skånetrafiken / Pågatågen. V1 = Pågatågen plus Öresundståg and
  Krösatågen (revised 30 Aug 2026 — both `in` under docs/board-eligibility-rule.md; no light
  rail — closed 1973; no bus).
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

1. **Regional key — sharpened 29 Aug 2026: it may not exist.** The adapter path is Trafiklab
   GTFS Regional `skane` (static + TripUpdates + VehiclePositions + occupancy per Trafiklab's
   table), but the local `TRAFIKLAB_GTFS_SWEDEN_KEY`/`_RT_KEY` get **403 "Key does not have
   access to file"** on the regional endpoints, and a Vercel env pull of the **development**
   environment shows **no `TRAFIKLAB_API_KEY` at all** — the inherited "same key as Göteborg,
   on Vercel" assumption is unverified. Before D2: (a) test the unlabeled `x-api-key` env var
   against `gtfs/skane/skane.zip` (untested — could be the regional key under another name);
   (b) check the production Vercel environment; (c) if neither, register a GTFS Regional key
   at trafiklab.se (Viv-lane outreach draft if registration needs an account decision).
   (RT catalog identity corrected: mdb-2970 = TripUpdates, 2971 = ServiceAlerts,
   2972 = VehiclePositions.)
2. ~~Ring via-suffix copy~~ — **DECIDED (Tim, 29 Aug 2026).** Outbound-through direction uses
   the official "mot Kävlinge" as-is; the terminating ring direction's chip is the abbreviated
   ring-side form **"Malmöring. v Östervärn"** (mirror "Malmöring. v Triangeln"). See
   direction-model-memo.md open question 2.
3. **Short-turn lists are observed-indicative**, from one fragmented week — assert per-trip far
   ends from the live feed at D5 (the site API exposes an official `towards` per departure),
   not a fixed list. Planned overlay to know about: Åstorp–Helsingborg closed 9 Sep–8 Nov 2026.
4. **Per-feed stop-id mapping.** Parent/child shape is now confirmed from GTFS Sweden 3
   (parented clusters: Malmö C parent `3` with ~60 platform children incl. bus lägen — filter
   by mode; Triangeln `1587`, Hyllie `1586`, Svågertorp `1546`, Persborg `1486`, Rosengård
   `1621`, Östervärn `59221`, Burlöv `937`, Oxie `27087`), but Skånetrafiken's site API uses a
   different stop-area GID scheme (Malmö C `9021012080000000`, Triangeln `9021012080140000`, …)
   and the regional feed's ids are unverified (see item 1) — map ids against whichever feed
   gets wired. Ring trips use two Malmö C platform groups on one trip (surface Spår 11 out,
   Citytunneln Spår 3a back).

Resolved since the second pass (29 Aug 2026, live checks): **line 3's Helsingborg end runs**
(hourly direct Pågatåg Vallåkra→Helsingborg C observed — the GTFS week's Gantofta truncation
was an artifact); **direction wording verified** against Skånetrafiken's journey API — ring
train 1420 shows `towards: "mot Kävlinge"` at Malmö C, buses "mot Stenkällan via Rosengård";
**parent/child catalogued** (above).

## Direction model

**Product + terminus ("Pågatågen mot `<far end>`") — matching Skånetrafiken's own verified
`towards` strings; Malmöringen's terminating direction uses Tim's signed-off chip
"Malmöring. v Östervärn" (mirror "Malmöring. v Triangeln"); never inbound/outbound, never raw
headsigns at Malmö C** (self-referential "Malmö central"). Worked §3 examples in
direction-model-memo.md use the live-verified strings.

## What I did not do

No live flip, no UI wiring, no D5 assertion tables, no bus scope creep, no rehosting of the
Skånetrafiken PDF artwork, no edits to any other city's pack, no station-catalog extension for
Krösatågen-only stations (decided out of scope, see oracle-clash-report.md's Board eligibility
section).

**Update, 30 Aug 2026:** `lib/providers/malmo.js` and `lib/providers/registry.js` WERE edited in
this pass, specifically and only to broaden Öresundståg/Krösatågen board eligibility per Tim's
product decision — see oracle-clash-report.md and hazard-pack.md for the reasoning. This is a
narrower edit than a full D2 wiring pass; the D2 items below (key scope, per-feed stop ids) are
still open.


7 Sep 2026 (docs/jim-brief-gtfs-snapshot-freshness.md): static snapshot refresh is now change-driven (manifest-probed, not daily-regardless) and the shared board join refuses a stale snapshot at request time (GtfsSnapshotStaleError) instead of silently serving a scheduled-times-as-live board.
