Solent D1 + research pack. City stays **planned** / "Coming Soon" until (a) National Rail is
unblocked (DARWIN_LDB_TOKEN) and (b) Jim wires testers live — this pack does not flip anything.
**assertCityLive("solent") must fail** (city is not in `lib/providers/registry.js` CITIES today —
Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip solent live from
this pack. Do not touch West of England, London & South East National Rail, Glasgow, or any other
UK region — same account-level National Rail blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Solent` / `luke` before writing (checked free first —
Edinburgh's lock released post-merge per PR #180). Release happens post-merge, per CLAUDE.md
country-lane rule — not run by this pack.

Research pack is docs/solent-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md,
direction-model-memo.md, jim-handoff.md (this file).

## The architecture decision: two hubs, not one — and not full flat Option A either

The oracle report explicitly asked for a Tim/Luke/Jim review before D1 proceeded (report lines
14-31, 92-99, 156), flagging Southampton and Portsmouth as a genuine two-center region with
distinct operator/direction sets, and proposing three options: single hub, two-hub, or full
multi-group (Option A precedent from London SE).

**My call: two-hub, with the Portsmouth side carrying an internal hub+secondary structure — not
full flat Option A, and not a single hub.**

### Why not single hub (Southampton Central only)

Would leave Portsmouth Harbour and Portsmouth & Southsea — both explicitly verdicted `in` for
SWR/Southern/GWR by the report's board-eligibility table (report lines 55-59, 66-67) — with no
board at all. That's silently dropping an entire in-scope, board-eligible corridor, which is
exactly what `docs/board-eligibility-rule.md` exists to prevent. Rejected for the same reason
london-se-national-rail rejected a single London terminus.

### Why not full flat Option A (n=3 independent hubs: Southampton Central, Portsmouth Harbour,
Portsmouth & Southsea, none related to each other)

Nothing in the report gives Portsmouth & Southsea the independent-corridor status that would
justify treating it as unrelated to Portsmouth Harbour the way London SE's seven termini are
mutually unrelated (each a genuinely different regional corridor). The report itself calls PMS
"secondary... both on Portsmouth waterfront" (line 22, 41) — a rider choosing between PMH and PMS
is picking a platform/walking-distance preference within one destination (Portsmouth), not
choosing between two different cities the way Southampton vs Portsmouth is. Treating PMS as a
third fully independent hub would overstate what the report supports.

### What I built instead: two hubs, one with a secondary board

- **Southampton Central** — stands alone, west-side hub.
- **Portsmouth Harbour** — east-side hub, paired with **Portsmouth & Southsea** as a secondary
  board on the same corridor (not merged into PMH's board, not promoted to a third independent
  hub). This is the same hub+secondary-hub shape West of England already uses for Bristol Temple
  Meads + Bath Spa — reused here rather than invented fresh, and applied only on the Portsmouth
  side since Southampton has no comparable secondary-station candidate in the report.

Southampton Central and the Portsmouth pair are **independent of each other** — do not merge them,
do not build a combined "Solent hub," do not pick one as primary and demote the other.

### What this means for adapter/registry design

- `published-network.json`'s `stationGroups` array (3 entries: `southampton-central`,
  `portsmouth-harbour`, `portsmouth-southsea`) is the unit of NR adapter work — same pattern as
  `docs/uk-architecture.md`'s "one Darwin adapter + region config passing a CRS allow-list," with
  three CRS allow-lists (`SOU`, `PMH`, `PMS`) inside one region config.
- None of the three boards need internal doNotGroup logic — a single CRS query per board, filtered
  by destination + operator for display, is sufficient per the evidence available (no report
  evidence of separate platform/boarding-section logic at any of the three, unlike London
  Bridge/Liverpool Street in london-se-national-rail).
- `junctions` (Fareham, Eastleigh) and `boundaryThroughRunning` (Westbury, Waterloo) in
  `published-network.json` are NOT stationGroups — they're in-scope corridor stations for
  next-train purposes but not separate boarding-board architecture units. Fold them into whichever
  hub's corridor query naturally includes them (Fareham/Eastleigh into either hub depending on
  direction; Westbury/Waterloo are boundary-only, do not build a Solent board at either).

## Boundary consistency — Westbury and Waterloo checked against their owning regions' finished packs

Per the dispatch instruction, checked (not read for general context — specifically for the
reciprocal-flag consistency check the task named):

- **Westbury (WSB):** `docs/west-of-england-d1/published-network.json`
  (`nationalRailStations.throughRunningOnly`) already records it as `"through-running only,
  boundary to Solent/Thames Valley regions — not a merge... De-duplicate at D2 if adjacent regions
  enter the app."` Consistent with this pack — Westbury is boundary-only here too, not a Solent
  stationGroup.
- **Waterloo (WAT):** `docs/london-se-national-rail-d1/published-network.json`
  (`stationGroups.waterloo.boundaryNote`) already records `"SWR continues southwest past this
  catalog's edge (West of England / Solent region, not yet built). Through-running only, not a
  merge point."` Consistent with this pack — Waterloo is boundary-only here too, not duplicated as
  a Solent stationGroup, even though Solent's own SWR services originate/terminate there.

No de-dup action taken by either side. This stays a D2/adapter-time concern — whichever region
wires its adapter second should not double-count departures at the shared boundary station. Not
resolved by this pack.

## Island Line — out-mode, not a rail defect

Excluded purely because the Ryde Pier Head ferry connection (Wightlink FastCat, 22 min) is a
separate transport mode, not because Island Line's rail service itself fails any boarding-contract
test. If an Isle of Wight region is ever built independently (with its own ferry-terminal-adjacent
station as its own entry point), this reasoning should be revisited — flagged, not decided here.

## National Rail: still blocked at account level

Same blocker as every other UK region — EvansAppStudio's RDM registration is AU, needs UK
re-registration before DARWIN_LDB_TOKEN can be provisioned. Not a feed problem, don't treat it as
one.

## Missing UK country ledger — flagged again

No `docs/united-kingdom-ledger.md` exists at time of writing (checked before starting this pack).
`docs/country-lane.md`'s "Standing retrofits" section names the UK ledger as required before the
next NR region. This is now the tenth NR region shipped without it (East Midlands, North East,
West of England, South Wales, Rest of Wales, Rest of Scotland, West Yorkshire,
london-se-national-rail, Glasgow, now Solent). This pack proceeds on the oracle report alone per
the dispatch instruction. The Westbury/Waterloo boundary facts recorded in this pack should
migrate into that ledger once it exists rather than being re-derived by the next region that
touches either boundary.

## Open items for Tim only — do not resolve

1. **Confirm the two-hub, hub+secondary architecture** is the intended shape — this pack's own
   judgment call, not a substitute for explicit sign-off given the oracle report asked for review
   by name (report line 31: "This section requires Tim/Luke/Jim architecture review").
2. **Portsmouth & Southsea's real ridership weight** — if materially busier than the report's
   qualitative "key commuter interchange" language suggests, may warrant promotion to a fully
   independent hub rather than a secondary board. Not decided here.
3. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
4. **UK country ledger retrofit** — overdue across ten NR regions now; should run before the region
   after this one, not indefinitely deferred.
5. **Short-turn confirmation** (H5) — whether SWR/Southern services short-terminate before the
   nominal corridor end needs confirming before destination-logic is trusted.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — same open item as every other UK NR region). National Rail static
GTFS (Transitland) is CC-BY-2.0 UK, confidence `clear`, reference-only, not used to derive this
catalog.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
GTFS fetch/parse, no invented station-graph or stop-order facts beyond what the report's tables
state, no invented destination strings, no CRS verification against a live feed, no
`docs/united-kingdom-ledger.md` creation (flagged as overdue, not this pack's job to write), no
wiring of `DARWIN_LDB_TOKEN`, no reading of any other city's in-progress (unfinished) pack —
West of England and london-se-national-rail's finished published-network.json files were read only
for the specific Westbury/Waterloo reciprocal-flag consistency check the dispatch instruction
named, not for general context.

## 5 Sep 2026 — pre-adapter hygiene (Fable, top-level session)

- **CRS codes verified live against Darwin** with `scripts/fix-uk-region-crs.mjs solent --write`:
  Fareham was FAR (a 400 at Darwin) and is now **FRM**; the other six were right. Corrected in
  `stations.json`, `published-network.json`, this pack's prose, `lib/providers/solent.js` and the
  planned gate. Coordinates filled from NaPTAN where missing. The adapter gate must carry the
  token-gated catalog sweep (as `qa/uk-west-midlands-dogfood-gate.mjs`) so this cannot regress.
- `DARWIN_LDB_TOKEN` exists (live since 2 Sep 2026); the account-level blocker above is resolved.
- Board eligibility section present in the oracle report, no `undecided` rows.

## 5 Sep 2026 — Adapter wired (Jim)

Adapter follows `docs/jim-brief-solent-adapter.md` in full. `status` stays `"planned"`,
`adapterReady: true`. This section supersedes the "account-level blocker" framing at the top of
this file — the token exists (see the hygiene section above), and the board calls below are real
Darwin responses, not fixtures.

### Two-hub architecture confirmation

Wired exactly as `direction-model-memo.md` and `published-network.json` specify: **two
independent hubs** — Southampton Central (SOU, stands alone) and Portsmouth Harbour (PMH, paired
with Portsmouth & Southsea PMS as a secondary board, not merged into PMH). `lib/providers/solent.js`
exposes `SOLENT_HUB` / `SOLENT_EAST_HUB` / `SOLENT_EAST_SECONDARY_HUB` as three independent catalog
resolutions; nothing in the adapter merges them, promotes one over the other, or treats Fareham as
a third hub. Not re-litigated.

### Live chip tables (destination + operator, 5 Sep 2026, `scripts/probe-uk-board.mjs --crs=...`)

**Southampton Central (SOU)** — 15 trips:

| Destination (chip) | Operator |
| --- | --- |
| Poole | South Western Railway |
| Romsey | South Western Railway |
| Salisbury | South Western Railway |
| Bournemouth | CrossCountry |
| Brighton | Southern |
| Weymouth | South Western Railway |
| Woking | South Western Railway |
| Bournemouth | South Western Railway |
| Basingstoke | South Western Railway |
| London Waterloo | South Western Railway |
| Portsmouth Harbour | Great Western Railway |
| Cardiff Central | Great Western Railway |
| Manchester Piccadilly | CrossCountry |

**Portsmouth Harbour (PMH)** — 10 trips:

| Destination (chip) | Operator |
| --- | --- |
| London Waterloo | South Western Railway |
| Cardiff Central | Great Western Railway |
| Barnham | Southern |

**Portsmouth & Southsea (PMS)** — 15 trips (secondary board, own physical station):

| Destination (chip) | Operator |
| --- | --- |
| Barnham | Southern |
| Portsmouth Harbour | South Western Railway |
| London Waterloo | South Western Railway |
| Southampton Central | South Western Railway |
| Portsmouth Harbour | Great Western Railway |
| Brighton | Southern |
| Portsmouth Harbour | Southern |
| Cardiff Central | Great Western Railway |

**Fareham (FRM)** — 15 trips (junction, both hub destinations split by operator):

| Destination (chip) | Operator |
| --- | --- |
| Portsmouth Harbour | Great Western Railway |
| Southampton Central | Southern |
| Brighton | Southern |
| Cardiff Central | Great Western Railway |
| Portsmouth Harbour | South Western Railway |
| Portsmouth & Southsea | South Western Railway |
| Southampton Central | South Western Railway |
| Woking | South Western Railway |
| London Waterloo | South Western Railway |

**Eastleigh (ESL)** — 12 trips (junction, no operator split found):

| Destination (chip) | Operator |
| --- | --- |
| Portsmouth Harbour | South Western Railway |
| London Waterloo | South Western Railway |
| Romsey | South Western Railway |
| Southampton Central | South Western Railway |
| Basingstoke | South Western Railway |
| Salisbury | South Western Railway |
| Winchester | South Western Railway |

**Westbury (WSB)** — 15 trips (West of England boundary, through-running only):

| Destination (chip) | Operator |
| --- | --- |
| Salisbury | Great Western Railway |
| Swindon | Great Western Railway |
| Bristol Temple Meads | Great Western Railway |
| Weymouth | Great Western Railway |
| Plymouth | Great Western Railway |
| London Paddington | Great Western Railway |
| Portsmouth Harbour | Great Western Railway |
| Cardiff Central | Great Western Railway |
| Frome | Great Western Railway |
| Cheltenham Spa | Great Western Railway |

**London Waterloo (WAT)** — 15 trips (London & South East National Rail boundary, through-running
only; Solent's own SWR services originate here):

| Destination (chip) | Operator |
| --- | --- |
| Addlestone | South Western Railway |
| Guildford | South Western Railway |
| Weymouth and Poole | South Western Railway |
| Hampton Court | South Western Railway |
| Twickenham | South Western Railway |
| Basingstoke | South Western Railway |
| Shepperton | South Western Railway |
| Hounslow | South Western Railway |
| Portsmouth Harbour | South Western Railway |
| Chessington South | South Western Railway |
| Reading | South Western Railway |
| Salisbury | South Western Railway |
| Woking | South Western Railway |

### Hub decision (direction hub anchoring, `lib/cities/solent/direction-hubs.json`)

Probed both brief-named candidates against the live boards above:

1. **Operator split on "Portsmouth Harbour" or "Southampton Central" at Fareham/Eastleigh
   (Liverpool shape).** Held at **Fareham only**, and held for **both** destinations
   simultaneously: FRM prints "Portsmouth Harbour" under Great Western Railway (18:29, 19:28) and
   South Western Railway (18:52), and "Southampton Central" under Southern (18:38, 19:05, 19:37)
   and South Western Railway (19:12). Confirmed with `--filter-crs`:
   `node scripts/probe-uk-board.mjs "Fareham" --region=solent --filter-crs=PMH` returns 5 trips,
   2 operators; `--filter-crs=SOU` returns 8 trips (Southern + South Western Railway on
   "Southampton Central", plus 2 Great Western Railway "Cardiff Central" trips that also call at
   SOU en route). Eastleigh's board shows no split — "Portsmouth Harbour" and "Southampton
   Central" both print under South Western Railway only, both times each — no hub warranted at
   Eastleigh.
2. **Kidderminster shape — from Eastleigh, west-of-Southampton termini (Poole/Weymouth/
   Bournemouth) absorbed into a Southampton Central hub.** Rejected:
   `node scripts/probe-uk-board.mjs "Eastleigh" --region=solent --filter-crs=SOU` returns only
   4 trips — Southampton Central and Salisbury, no Poole/Weymouth/Bournemouth service calling at
   SOU from Eastleigh in the live sample. Per the brief's own rule ("if the filtered board doesn't
   show it, it isn't"), no hub built for this candidate.

**Infra limitation found and flagged, not resolved here:** the shared
`lib/cities/uk/direction-hubs.js` helper's `findHubForStation()` returns only the first configured
hub whose `appliesFrom` includes a given station CRS — one station can carry at most one hub. Since
Fareham qualifies for both a "Portsmouth Harbour" hub and a "Southampton Central" hub
simultaneously (candidate 1 above), only one can actually be wired. **Portsmouth Harbour is the
one built** (named first in the brief's candidate list; evidence is otherwise symmetric between
the two). Southampton Central's identical split at Fareham is not collapsed into a hub chip — it
still routes correctly via the existing exact-chip path (`filterCrs=SOU`), just displayed as two
separate operator-suffixed chips instead of one merged label. Editing the shared helper to support
multiple hubs per station is out of scope for this pack (guardrail: no edits to
`lib/cities/uk/*`) — flagged for Tim/Luke as a follow-up if this shape recurs in another region.

No hub warranted at Southampton Central, Portsmouth Harbour, Portsmouth & Southsea, Westbury or
Waterloo themselves — each is either a hub/secondary-hub board in its own right or a boundary-only
through-running station, not a through-station a rider anchors past.

### Eligibility statement

South Western Railway, Southern, Great Western Railway and CrossCountry are all verdict `in` per
`oracle-clash-report.md`'s Board eligibility section (no compulsory reservation, no check-in
barrier) — no `undecided` rows. No operator-level filtering is applied by the adapter; every
Darwin `trainServices` entry at these seven CRS codes stays on the board unfiltered. Island Line
remains excluded entirely (out-mode, ferry dependency), not catalogued in any form.

### Not done in this pass (by design)

No `status: "live"` flip (Mark/Tim's call). No `MULTI_CITY_IDS`/`brisbane-dogfood.js`/
`journey-model.js` list-membership edits — those are bundled into the flip commit per
CLAUDE.md's flip-follow-through split; `registry.js`'s notes name exactly what to add. No
`public/city-directions/solent.json` generated — same as West Yorkshire, not generated pre-flip
(no marketing-directions.js exists for a destination+operator-only region; directions are derived
live). No edits to `lib/providers/uk-darwin.js`, `lib/providers/uk/catalog.js`, `lib/cities/uk/*`,
or any other region's files.
