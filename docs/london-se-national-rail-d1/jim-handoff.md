London & South East National Rail D1 + research pack. City stays **planned** / "Coming Soon" until
National Rail is unblocked AND Jim wires testers live — this pack does not flip anything.
**assertCityLive("london-se-national-rail") must fail** (city is not in `lib/providers/registry.js`
CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip
london-se-national-rail live from this pack. Do not touch West Midlands, Greater Manchester,
Liverpool City Region, East Midlands, North East, West of England, South Wales, Rest of Wales,
Rest of Scotland, or West Yorkshire — same account-level National Rail blocker, but separate
regions/packs.

Lane lock: acquired `United Kingdom` / `London & South East National Rail` / `luke` before writing
(release happens post-merge, per CLAUDE.md country-lane rule — not run by this pack).

Research pack is docs/london-se-national-rail-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## THE ARCHITECTURE — READ THIS FIRST, it's a first for the pipeline

**This is the first region in the pipeline with no single hub-lock.** Every prior city (AU/NZ/CA
plus every UK region so far — South Wales/Cardiff Central, East Midlands, North East, West of
England) used one locked hub station and one CityConfig hub. **This region does not.** Tim decided
**Option A: per-terminus station groups** (the report's own recommendation, report line 81) — the
region is **seven independent station groups**, each with its own operator set, its own
doNotGroup logic, and its own §3 direction model. An eighth candidate (Euston) is flagged but not
built (no named operator — see below).

**What this means for adapter/registry design (do not build a single CityConfig hub for this
city):**

- `published-network.json`'s `stationGroups` array is the unit of adapter work, not the file as a
  whole. Each entry has its own `crs`, `operators`, and `doNotGroup` flag.
- Two groups require **internal** doNotGroup (multiple operators at one physical station, separate
  boarding sections):
  - **London Bridge** — Southeastern / Southern / Thameslink (three boards)
  - **Liverpool Street** — Greater Anglia / c2c (two boards)
- Five groups are single-operator-in-catalog and don't need internal doNotGroup: Waterloo (SWR),
  Victoria (Southern + Gatwick Express, same agency family), King's Cross (Great Northern),
  St Pancras International (Thameslink), Paddington (GWR).
- **Do not collapse these seven groups into one board.** They are genuinely separate destinations,
  not alternate routes to the same place (report line 57) — this is the whole reason Option A was
  chosen over Option B (London Bridge as sole hub-lock) or Option C (flat network).
- If `CityConfig` (per `docs/multi-city-provider-design.md`) assumes exactly one hub per city, this
  region needs either a multi-hub extension to that shape, or seven `CityConfig`-like entries under
  one city id (`london-se-national-rail`) sharing one Darwin provider instance with different CRS
  allow-lists per group. **This is a design decision for you, not pre-solved here** — flagging it
  explicitly since it's the first time the pipeline has needed it. Consider whether
  `docs/uk-architecture.md`'s "one Darwin adapter + region configs passing a CRS allow-list" pattern
  (already the plan for every UK region) extends cleanly to sub-region groups, or needs a new layer.

## Board-eligibility resolution: LNER excluded (undecided → excluded, not guessed)

The oracle report left LNER's verdict `undecided` — its "one unreserved carriage per service"
policy vs. its "compulsory reservations" company-policy language couldn't be settled from the
report alone. This pack's dispatch instruction was to research it properly before finalizing.

**What was tried:** `curl` fetches (with a browser user-agent) of:
- `lner.co.uk`'s seat-reservations page — returned a fully client-side-rendered Next.js shell with
  no reservation-policy text in the server HTML.
- The LNER Wikipedia article — loaded fine (497KB, verified "London North Eastern" appears 20
  times) but contains zero occurrences of "reserv" anywhere in the article — no reservation-policy
  content to cite.
- A direct Google search — blocked (JS-only results page, no server-rendered snippet text).
- DuckDuckGo's HTML-only search endpoint (`html.duckduckgo.com/html/`) — returned an anti-bot
  challenge page ("Unfortunately, bots use DuckDuckGo too... select all squares containing a
  duck"), no results.

**No verifiable operator-policy text was obtainable with the tools available to this lane** (no
authenticated web-search tool, only raw `curl`, against sites that are either JS-rendered or
anti-bot-gated). This is a **tooling limitation, not a closed research question** — a real answer
almost certainly exists (LNER's actual policy is publicly documented somewhere a human browser or
a proper search tool could reach), but this pack could not reach it.

**Per the dispatch instruction, the correct move when genuinely unable to verify is: keep
`undecided`, exclude from the catalog, don't guess.** LNER is excluded from
`published-network.json` (see `stationGroups[kings-cross].excludedOperators` and
`excludedServices`). **This should go back to Nico or Tim as a targeted follow-up** — ideally a
direct query to LNER's customer service, or a proper web-search-capable research pass, rather than
another `curl` attempt from this lane. Until that happens, King's Cross's Great Northern group
stands alone; LNER does not appear anywhere in this catalog.

## Gap: Euston not built (no named in-scope operator)

The report's architecture section (C2/C3 point 5) lists Euston with "Regional services, Caledonian
Sleeper" — but **no TOC name is ever given for the "regional services" part**, anywhere in the
report (not in the TOC scope list at lines 9/31/38, not in the board-eligibility table). In reality
Euston is served by Avanti West Coast and London Northwestern Railway, but **neither name appears
in this report**, and inventing one would be exactly the kind of station-graph guess this lane is
told not to make. Caledonian Sleeper (the only named Euston operator) is excluded anyway
(out-reservation). **Euston has no station group in this pack.** If a future oracle pass names
Euston's regional operator and gives it a board-eligibility verdict, it slots in as an eighth
group using the same destination+operator model as the other seven — see direction-model-memo.md.

## Gap: seven secondary termini not built

Blackfriars, Cannon Street, Charing Cross, Farringdon, Fenchurch Street, Marylebone, Moorgate are
all marked "TBD...may be out-of-scope D1" in the report (line 53/101) — none are built as station
groups. Farringdon and Blackfriars are named again as Thameslink calling points in the
board-eligibility table (line 147), which is suggestive they should eventually be in-catalog (at
least as extra stops within the St Pancras/Thameslink group, not as their own termini-level
groups) — but this pack doesn't make that call on the report's behalf. Flagged as an open item for
a future Nico pass, not resolved here.

## CRS codes are unverified — confirm before wiring

Every `stationGroups[].crs` value in `published-network.json` has `crsVerified: false`. These come
from the oracle report's own "(examples)" list (report line 256), which the report itself marks as
not confirmed against a live GTFS dump or Darwin response (report line 103: "subject to GTFS
stop_name exact match at D1 pack time"). Confirm against the Transitland National Rail GTFS feed
(`f-gc-rail~delivery~group~planar~gtfs`) or a live Darwin payload before using these codes in an
adapter's allow-list.

## Regional boundaries — flagged, not resolved (D2/ledger concern)

- **GWR at Paddington** continues west into the already-built West of England region (Bristol
  Temple Meads hub, `docs/west-of-england-d1/`). No station overlap — Paddington itself is not a
  West of England catalog entry, only referenced there as a destination string.
- **SWR at Waterloo** continues southwest toward a Solent/West of England-adjacent area not yet
  built as its own region.
- **CrossCountry** through-runs nationally; not resolved here.
- **LNER** would continue north from King's Cross into East Midlands, but is excluded from this
  catalog entirely (see above) — so there's no LNER de-dup concern at D1, only a latent one if
  LNER is ever un-excluded later.

None of this is resolved in this pack — it's the same "flag for D2 multi-region ledger" treatment
every other UK region has used.

## Missing UK country ledger — flagged again

`docs/country-lane.md`'s "Standing retrofits" section names the UK ledger as required **before the
next NR region**. This is that next NR region (after East Midlands, North East, West of England,
South Wales, Rest of Wales, Rest of Scotland, West Yorkshire all shipped without it). No
`docs/united-kingdom-ledger.md` or `docs/uk-ledger.md` exists. This pack proceeds on the oracle
report alone, per the dispatch instruction (read only the report; no cross-region inference) — but
this gap is real and should be raised to Tim/Nico, not quietly carried forward again. The
boundary facts flagged above (GWR/Paddington, SWR/Waterloo, CrossCountry, LNER) are exactly the
kind of cross-region fact the ledger exists to hold centrally instead of being rediscovered per
region.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
2. **LNER board-eligibility verdict** — needs a real operator confirmation (direct query to LNER,
   or a proper search-capable research pass), not another curl attempt. See above.
3. **Euston's regional operator** — needs a follow-up oracle pass naming the TOC and giving it a
   board-eligibility verdict before a station group can be built.
4. **UK country ledger retrofit** — overdue per `docs/country-lane.md`'s own standing-retrofit
   note; should run before the region after this one.
5. **Multi-group CityConfig shape** — first region needing more than one hub per city id; needs a
   design decision (see "THE ARCHITECTURE" above), not something this pack pre-solves.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — see open item above). National Rail static GTFS (Transitland) is
CC-BY-2.0 UK, confidence `clear`, reference-only.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit, no
invented National Rail route/line topology (Darwin has no printed route map), no invented
destination strings beyond illustrative placeholders explicitly marked as such, no Euston station
group or secondary-terminus catalog entries (no named operator / report marks TBD, respectively),
no LNER verdict fabrication (kept undecided, excluded, per dispatch instruction), no CRS
verification against a live feed, no resolution of the GWR/SWR/CrossCountry boundary questions or
the RDM redistribution ambiguity (all flagged for Tim/D2/ledger), no wiring of `DARWIN_LDB_TOKEN`,
no creation of a UK country ledger (flagged as overdue, not this pack's job to write), no reading
of any other city's in-progress pack.
