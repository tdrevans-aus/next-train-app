Malmö D1 + research pack. City stays **planned** until Jim wires testers live. Existing live/planned
cities untouched (Göteborg, Stockholm, Oslo, Rotterdam, Berlin, Munich, Hamburg, etc.). Do not merge
malmo into goteborg or stockholm. **assertCityLive("malmo") must still fail** (city not in
`lib/providers/registry.js` today). No generator, no PR, no product edit. Tim copies files; Jim owns
D2–D6. Do not flip malmo live from this pack.

Pack files: `docs/malmo-d1/{oracle-clash-report,hazard-pack,direction-model-memo}.md`,
`published-network.json`, this file.

**Read the hazard-pack and direction-model-memo before wiring — this pack is thinner than Oslo/
Rotterdam/Newcastle's, on purpose, because the oracle report was thinner. Do not fill the gaps
yourself from GTFS as a substitute for D1 verification; flag back to Nico/Tim instead.**

## What's solid (cite: oracle-clash-report.md)

- **city=malmo**, agency Skånetrafiken / Pågatågen. Trafiklab GTFS Regional operator code `skane`
  confirmed to resolve correctly. Same `TRAFIKLAB_API_KEY` as Göteborg, different operator code.
- **V1 scope: Pågatågen commuter rail only.** No light rail — tracker's "commuter + light rail"
  label is wrong; Malmö's tram system closed in 1973, only a seasonal museum tram remains, not v1.
  No bus, no Öresundståg.
- **Hub lock: Malmö C** (Malmö Central Station). City Tunnel terminus/portal, opened Dec 2010.
  "All or most" Pågatågen lines serve it.
- **doNotGroup Malmö C Pågatågen vs Malmö C Öresundståg.** Öresundståg is a separate cross-border
  operator (Skånetrafiken + DSB + Region Hovedstaden), same station string, not v1.
- **GTFS-RT is live for `skane`** (Static + Real-time + Vehicle positions confirmed via Trafiklab
  operator table / Mobility Database mdb-2971, checked 2026-08-28) — unlike Göteborg's schedule-only
  gap, Malmö can use TripUpdates + vehicle positions for the D2+ live board.
- **Europe/Stockholm HAS DST.**
- 9 Malmö-area station names (Malmö C, Triangeln, Hyllie, Svågertorp, Persborg, Rosengård,
  Östervärn, Burlöv, Oxie), hand-transcribed from Trafiklab GTFS `stops.txt`, not from an official
  passenger map (see below).

## What is NOT solid — do not wire around these, resolve them first

1. **No per-line station/termini data exists in the oracle report for any of the 11 regular lines
   or rush-hour line 12.** `published-network.json`'s `lines[]` is intentionally empty. Before
   writing the adapter's line/direction logic, either (a) get the Skånetrafiken linjenät PDF read
   (currently egress-blocked — this pipeline should not route around that block itself) or (b) have
   the D2+ implementation read `routes.txt`/`trips.txt` from the confirmed-live `skane` GTFS feed
   directly and treat that as an implementation detail to verify against a passenger-facing source
   later, not as a D1 substitute.
2. **Line codes are unconfirmed.** The report's "H3, H4, E6, etc." is explicitly hedged as an
   expected format, not a confirmed one. Don't hardcode that naming pattern.
3. **Possible Öresundståg overlap at Triangeln and/or Hyllie** (both City Tunnel stations, same
   2010 project as Malmö C) is flagged but not confirmed either way in the oracle report. Verify
   before assuming these two stops are Pågatågen-only.
4. **Malmöringen (ring line) route path is unknown.** Svågertorp, Persborg, and Östervärn are each
   tagged "ring-line stop" with no route detail. If a published line calls one of these stations
   twice on a single through-path — the way Oslo's line 5 calls Stortinget twice — inbound/outbound
   direction labeling breaks the same way it did there. Confirm before assuming simple
   inbound/outbound works anywhere on this network.
5. **Burlöv and Oxie inclusion is conditional** — the oracle report itself only says "keep in v1 if
   GTFS includes it," which was not independently checked.

## Direction model

Recommend **line + terminus** (matches every sibling city), likely aligning with Swedish "mot
`<destination>`" platform signage — but this is a reasoned default pending confirmation, not a
locked model. No worked §3 examples exist yet because there are no confirmed termini to put in
them. See `direction-model-memo.md` open questions before writing D5 assertion tables.

## What I did not do

No generator from GTFS, no per-line station arrays invented, no PDF fetch around the egress block,
no Öresundståg data pulled in, no bus/light-rail scope creep, no D5 assertion tables, no live city
flip, no `lib/providers/` or `registry.js` edit, no read of any other city's in-progress pack.
