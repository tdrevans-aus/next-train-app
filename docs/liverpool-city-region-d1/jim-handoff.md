Liverpool City Region D1 + research pack. City stays **planned** / "Coming Soon" until (a)
National Rail is unblocked (`DARWIN_LDB_TOKEN`), (b) Merseyrail's real-time feed status is
confirmed with Merseyrail (or explicitly accepted as permanently schedule-only), (c) the Lime
Street structural ambiguity (H1) is resolved, (d) the Ellesmere Port registry discrepancy is
resolved, and (e) Jim wires testers live — this pack does not flip anything. **assertCityLive
("liverpool-city-region") must fail** (city is not in `lib/providers/registry.js` CITIES today —
Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not touch
`uk-ellesmere-port` or any other UK region's entry — same account-level National Rail blocker, but
separate regions/packs.

Lane lock: acquired `United Kingdom` / `Liverpool City Region` / `luke` before writing (checked
free first — `node qa/lane-lock.mjs check "United Kingdom"` returned "free", Greater Manchester's
lock released post-merge, PR #183).

Research pack is docs/liverpool-city-region-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file). This was a fresh
from-scratch build 1 Sep 2026 — the tracker's prior "Packed 2026-08-28" claim was false; no trace
of an earlier Liverpool City Region pack existed anywhere in the codebase before this one.

## V1 scope decision — READ THIS BEFORE WIRING

**The oracle report left the Merseyrail v1 scope question open, recommending National Rail only
(Option B) as its headline suggestion. This pack builds Option A instead: National Rail +
Merseyrail, Merseyrail schedule-only.**

Reasoning (full detail in direction-model-memo.md):

1. **National Rail's blocker (DARWIN_LDB_TOKEN) is account-level, not catalog-level** — same as
   every other UK region this wave. It doesn't compound with Merseyrail's separate real-time
   uncertainty; the two blockers are independent and both should be built through, not around.
2. **Merseyrail's static schedule is confirmed live** (Transitland `f-gc-rail~delivery~group~
   planar~gtfs`, verified 2026-08-31). Only real-time is unconfirmed — no public GTFS-RT endpoint
   found anywhere. This is exactly the shape this pipeline already shipped twice this wave:
   **Greater Manchester's Metrolink** (schedule-only, TfGM portal deprecated) and **South
   Yorkshire's Supertram** (schedule-only, no SYFTL feed confirmed). Neither of those modes was
   deferred entirely for the same reason Merseyrail's report recommends deferring here.
3. **Board eligibility verdicts Merseyrail `in`** (report line 84, walk-up, no reservation, no
   check-in barrier) — deferring a board-eligible, in-scope mode to H2 without a Merseyrail-specific
   reason distinct from Metrolink's/Supertram's would be inconsistent with how this pipeline treats
   "confirmed static, unconfirmed real-time" everywhere else it's come up.
4. **Scale matters:** Merseyrail is 69 stations, larger than the report's own ~30–40 estimate for
   National-Rail-only stations in this region. Deferring it would ship a catalog that excludes the
   majority of the region's rail network and both named Merseyrail interchange stations (Liverpool
   Central, Moorfields).

**This is a deliberate deviation from the report's headline recommendation — flagged as open item
1 for Tim in direction-model-memo.md. Confirm this scope call makes sense before wiring; do not
default back to "National Rail only" without re-reading the reasoning above and in
direction-model-memo.md.**

## Hub architecture — two separate agency structures, Lime Street structurally ambiguous

- **National Rail:** hub lock = **Liverpool Lime Street (LIV)**. Secondary hub = **Liverpool
  South Parkway (LPY)**. Standard hub+secondary-hub pattern, unambiguous.
- **Merseyrail:** interchange pair = **Liverpool Central** and **Moorfields** — both named
  "dual-line interchange" by the report with no ranking given between them. Neither built as sole
  hub lock over the other.
- **Liverpool Lime Street's Merseyrail relationship is UNRESOLVED — read hazard-pack.md H1 before
  wiring the station graph.** The report contradicts itself: line 41 says Merseyrail
  "interchanges at platform level" at Lime Street (implying shared platforms/building); line 73 and
  C2/C3 point 2 say "separate infrastructure, separate entrance/footbridge" (implying a walk-link
  pair). No distance/time figure is given either way, unlike Manchester Victoria's explicit
  "escalator/lift, 2–5 min" or Manchester Piccadilly/Piccadilly Gardens' explicit "~100m, 5–10
  min." This pack built Lime Street as **two separate stationGroups** (`liverpool-lime-street-nr`
  and `liverpool-lime-street-merseyrail`), `doNotGroup: true` between them, using the more
  conservative separate-infrastructure reading — safe either way (never risks a false merge), but
  genuinely unconfirmed. **Confirm with a walk-distance figure, site documentation, or a live
  Merseyrail/Darwin response before treating this as the final station graph.**

## Ellesmere Port registry discrepancy — second flag, needs an actual decision

This is now the **second time** this has been flagged (Nico flagged it first, in research; this
pack flags it again per the dispatch instruction). Not resolved here — this is explicitly a
Jim/Tim call, not a data question, and this pack has **not touched `uk-ellesmere-port` or
`registry.js`**.

- The tracker states Ellesmere Port should be "folded into Liverpool City Region... not a separate
  picker city."
- `lib/providers/registry.js` currently has `uk-ellesmere-port` as its own standalone entry
  (status "planned").
- This pack's Merseyrail scope already includes Ellesmere Port as a Wirral Line terminus
  (`stationGroups` id `ellesmere-port` in `published-network.json`), so there is no technical
  reason to keep a separate picker city unless a product decision demands it.
- **Decision required at wiring stage:** merge `uk-ellesmere-port` into `liverpool-city-region`
  (remove the standalone registry entry, absorb its CRS list into this region's scope), or keep it
  standalone and accept the tracker's "fold in" note is overridden. Either way, this needs an
  actual resolution — it should not be flagged a third time.

## Direction model recommendation

**Merseyrail: line + terminus** — same model as every reference metro/light-rail pack (Rotterdam,
Newcastle, Boston, East Midlands NET, South Yorkshire Supertram, Greater Manchester Metrolink).
Two lines (Northern Line, Wirral Line), termini/branches only given by the report (not a full
69-stop order — real gap, same shape as Metrolink's 99-stop gap).

**National Rail: destination + operator**, no line+terminus model — same as every prior UK
National Rail region. At Lime Street this applies across all seven operators in one flat board (no
evidence of platform-mixing complexity requiring an internal doNotGroup among the NR operators
themselves — doNotGroup only applies against the Merseyrail layer, per H1). **Illustrative only,
not verified** — no destination strings can be confirmed until `DARWIN_LDB_TOKEN` exists and a
real Darwin payload can be pulled. See direction-model-memo.md for full reasoning and options
considered.

## Skip risk — Merseyrail real-time feed status (genuine unknown, not the standard account block)

No documented public GTFS-RT endpoint found in Transitland, Mobility Database, or Merseyrail's own
developer documentation — only a mobile app ("Train Check") with an undocumented internal API. This
is a different *kind* of hazard than the National Rail account block — it is not "Tim needs to
re-register," it may genuinely be "no public real-time feed exists for Merseyrail at all." Same
shape as Greater Manchester's Metrolink gap and South Yorkshire's Supertram/SYFTL gap.
**Merseyrail ships v1 schedule-only.** Whoever wires this adapter should first contact Merseyrail
(data@merseyrail.org / https://www.merseyrail.org/) to confirm whether a public feed exists or is
planned before assuming this is a temporary state.

## Open items for Tim only — do not resolve

1. **Confirm the National Rail + Merseyrail (schedule-only) v1 scope decision** — this pack's own
   judgment call, departing from the oracle report's headline recommendation (defer Merseyrail).
   See reasoning above and in direction-model-memo.md.
2. **Lime Street/Merseyrail structural relationship is unresolved** (hazard-pack.md H1) — report
   contradicts itself, no distance/time figure given. Confirm before Jim wires the station graph.
3. **Merseyrail real-time feed status** — genuinely unknown, Merseyrail contact needed. See skip
   risk above.
4. **Ellesmere Port / `uk-ellesmere-port` registry discrepancy** — second flag, needs an actual
   decision at wiring stage (merge into this region, or keep standalone and override the tracker's
   note).
5. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers and receives a token.
6. **Liverpool Central vs Moorfields ranking** — report names both as Merseyrail "dual-line
   interchange" with no ranking given, unlike Metrolink's explicit St Peter's Square-over-Victoria
   ranking. Confirm if a real ranking exists before treating one as senior to the other.
7. **UK country ledger retrofit is still overdue** — no `docs/united-kingdom-ledger.md` exists as
   of this pack (Greater Manchester's pack flagged this as overdue too; still not written). The
   Lime Street structural ambiguity and Ellesmere Port discrepancy recorded here are exactly the
   kind of cross-region facts that ledger should hold once it exists, rather than being re-derived
   by a future region.
8. **96 CRS tracker claim is unverified** (report line 57) — this pack enumerates only the five
   individually named stations (Lime Street, South Parkway, Central, Moorfields, Ellesmere Port);
   the remaining ~90-100 stations are a real gap, not populated. Pull the confirmed static GTFS
   feed for the full station list at adapter time.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail static GTFS (Transitland) is CC-BY-2.0 UK,
confidence `clear`, reference-only. National Rail real-time is OGL 2.0 baseline with NRE
amendments, confidence `unclear` on third-party redistribution — same open item as every other UK
NR region. Merseyrail static GTFS inherits CC-BY-2.0 UK via the bundled national feed, confidence
`unclear` (no separate Merseyrail license page found — verify feed metadata before shipping).
Merseyrail real-time has no license because no confirmed feed exists — confidence `not found`.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit
(including no edit to `uk-ellesmere-port`), no GTFS fetch/parse (Transitland's National Rail feed
is verified live and cited, but not pulled — station names/lines come from the oracle report's own
tables), no invented station-graph or stop-order facts beyond what the report's tables/C2/C3 points
state (Merseyrail's full 69-stop order is a real gap, not filled), no invented destination strings,
no CRS verification against a live feed or Darwin response, no resolution of the Lime
Street/Merseyrail structural ambiguity (H1, flagged not resolved), no resolution of the Ellesmere
Port registry discrepancy (Jim/Tim call, second flag), no resolution of the OpenLDBWS
redistribution-terms ambiguity (open item for Tim, same as every other UK NR region), no
resolution of the Merseyrail real-time feed status (open item for Tim/Merseyrail contact), no
wiring of `DARWIN_LDB_TOKEN`, no `docs/united-kingdom-ledger.md` creation (flagged as overdue, not
this pack's job to write), no reading of any other city's in-progress (unfinished) pack.
