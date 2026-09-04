# Luke brief: rescope Liverpool City Region from 6 stations to the full network

**For:** Luke (data pack)
**From:** Tim (via top-level session)
**Date:** 2 Sep 2026
**Status:** Ready — Tim has explicitly rejected the current 6-station catalog as too thin for a real launch
**Reads:** `docs/liverpool-city-region-d1/oracle-clash-report.md` (Nico's original research — already has most of what you need), the currently-live but under-scoped `lib/cities/liverpool-city-region/stations.json`, `docs/liverpool-city-region-d1/{hazard-pack.md,direction-model-memo.md,jim-handoff.md,published-network.json}`
**Writes:** an expanded `lib/cities/liverpool-city-region/stations.json`, updated `hazard-pack.md`/`direction-model-memo.md`/`published-network.json`, and a new addendum documenting what changed and why
**Out of scope:** adapter wiring (`lib/providers/liverpool-city-region.js`, `lib/cities/liverpool-city-region/dogfood-next-train.js`) — that's Jim's job once your pack is done. Do not touch `lib/providers/registry.js` or anything under `public/`.

---

## 1. Why

The shipped D1 pack (and the flip PR built on it, `#194`, currently open and not merged — do not assume it merges as-is) catalogs only 6 stations: 2 National Rail (Liverpool Lime Street, Liverpool South Parkway) and 4 named Merseyrail interchanges/termini (Liverpool Lime Street again, Liverpool Central, Moorfields, Ellesmere Port). Tim's read: this is a leftover from when Ellesmere Port was going to be its own thin test-corridor region (`uk-ellesmere-port`, deleted 2 Sep 2026 as a hangover — see `docs/uk-architecture.md`'s note on it) — the pack never actually expanded to cover the real city region once that plan changed.

Nico's own original oracle report already flagged this gap and told the D1 pack stage to close it — it never did. From `oracle-clash-report.md`:

> **Scope note — 96 CRS claim:** ... National Rail stations in the Liverpool City Region (Northern Trains franchise footprint) number approximately 30–40 major stations ... Merseyrail adds 67 stations (managed). Total combined would be ~100–107 stations ... **Verify station count during D1 pack stage; do not assume all 96 are in-scope.**

That verification never happened. This brief is that D1 pack stage, done properly.

## 2. What "full network" means here

- **Merseyrail: all 69 stations** — Northern Line (39 stations, Liverpool–Southport/Ormskirk/Headbolt Lane) and Wirral Line (34 stations, Liverpool–Ellesmere Port/West Kirby/Chester), per Nico's own report line 21. Static GTFS is already confirmed live via Transitland (Onestop ID `f-gc-rail~delivery~group~planar~gtfs`, verified 2026-08-31) — this should give you the full stop list with real coordinates, unlike the current catalog where every station's `lat`/`lng` is null. Pull and parse it properly this time; don't hand-pick names from the oracle report's prose the way the original pack did.
- **National Rail: the full City Region footprint**, not just the two hub stations. Nico estimated ~30–40 major stations across Liverpool, Sefton, Wirral, Cheshire, and Halton (report line 21, 57, 122). You need to turn that estimate into a real, sourced CRS list. Check first whether the same method other UK regions used for their own National Rail catalogs is reusable here — West Midlands sourced its 75 stations from "ORR Table 6329"; other regions (South Yorkshire, North East) used a DFT Bus Open Data no-key bulk GTFS archive pull (see their own `registry.js` notes and hazard packs for exactly how — `git log --all --grep "D2 pull"` or similar to find precedent commits if the prose alone isn't enough). Reuse whichever of those sources is actually accessible to you without new web research.

## 3. If you get stuck sourcing the National Rail list

You have `Bash` but not `WebFetch`/`WebSearch` — if none of the precedented no-key bulk sources actually gives you a clean way to filter National Rail stations to "within Liverpool City Region," **don't guess a station list or invent CRS codes.** Write down exactly what you tried, what's missing, and hand it back — the top-level session will loop Nico in for a short, scoped follow-up (confirm the CRS list only, not a full re-research pass) rather than you inventing data. This matches how the pipeline is supposed to work: Nico researches, you build from what Nico confirmed. Escalating a genuine sourcing gap is the correct move, not a failure.

## 4. What changes in your output

- `lib/cities/liverpool-city-region/stations.json`: full station list for both agencies, `mode: "train"` / `mode: "metro"`, real `lat`/`lng` where the GTFS gives them (don't leave every coordinate null this time if the data is actually available — that was a real gap in the original pack, flagged in its own file header).
- Keep the existing doNotGroup treatment at Liverpool Lime Street (two entries, same printed name, different mode, H1 unresolved) — don't touch that structural decision, just make sure it still holds once the catalog is much bigger.
- `direction-model-memo.md`: the current pack only generates marketing chips for Ellesmere Port because it's the only "genuinely confirmed" terminus in the old 6-station scope. With the full network, work out what the direction model should be for a much bigger catalog — likely still line + terminus per branch (Northern Line's and Wirral Line's real branch termini), not per-station chips for all 69 stops. Say clearly what you built and why.
- `hazard-pack.md`: update station counts, note what's now fully covered vs. still a gap (e.g. if intermediate stop *order* within a line still can't be fully confirmed, say so — a complete station list and a complete ordered timetable are different things).
- `published-network.json`: update to match.
- A short addendum (new section or new file, your call) explicitly stating: previous count (6), new count, source used for each agency's list, and confirmation the doNotGroup Lime Street treatment and the Merseyrail `out-product` board-eligibility verdict (corrected 2 Sep 2026 — see the oracle report's Board eligibility section) both still hold at the new scale.

## 5. Handoff

Once your pack is done and self-consistent, hand off to Jim (adapter rewiring for the expanded catalog) the same way any D1 pack normally does — write a `jim-handoff.md` update, don't message Jim directly. Mark will re-QA and re-flip after that; the currently-open `#194` PR will need to be superseded, not merged as-is, once this rescope lands — flag that explicitly in your output so nobody merges the thin version by mistake.

## 6. Guardrails

- The UK lane lock is already held for `liverpool-city-region` (acquired by the top-level session) — you're clear to proceed, don't re-acquire or release it.
- Run `node qa/uk-region-catalog-conformance.mjs` and `node qa/liverpool-city-region-dogfood-gate.mjs` after your changes — they will likely need count assertions updated to match the new totals; that's expected and fine to do as part of this work, but don't touch assertions for any other region.
- Commit your work before reporting done.
