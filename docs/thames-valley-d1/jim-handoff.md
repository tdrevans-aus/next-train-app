Thames Valley D1 + research pack. City stays **planned** / "Coming Soon" until (a) National Rail
is unblocked (`DARWIN_LDB_TOKEN`) and (b) Jim wires testers live — this pack does not flip
anything. **assertCityLive("thames-valley") must fail** (city is not in
`lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim
owns D2–D6. Do not flip thames-valley live from this pack. Do not touch West of England, Solent,
London & South East National Rail, or any other UK region — same account-level National Rail
blocker, but separate regions/packs.

Lane lock: acquired `United Kingdom` / `Thames Valley` / `luke` before writing (checked free first
— Solent's lock released post-merge, PR #181). Release happens post-merge, per CLAUDE.md
country-lane rule — not run by this pack.

Research pack is docs/thames-valley-d1/: published-network.json, oracle-clash-report.md,
hazard-pack.md, direction-model-memo.md, jim-handoff.md (this file).

## Architecture: hub + secondary-hub, reused from West of England/Solent — with a doNotGroup twist

**Reading (RDG)** is the hub lock — principal interchange, 15 platforms, three operators (GWR
primary, CrossCountry, SWR through-running) but **no internal doNotGroup** — the report explicitly
rules out multi-operator platform mixing at Reading (line 36), so it's a single flat
destination+operator board like Southampton Central in Solent's pack.

**Oxford (OXF)** is the secondary hub — but unlike Bath Spa (West of England) or Portsmouth &
Southsea (Solent), Oxford **needs doNotGroup: true**. GWR's main line and Chiltern Railways'
Marylebone branch sit on separate platforms and separate infrastructure at Oxford (report line 16,
37, 56, C2/C3 point 4/6) and the report explicitly calls for "separate boarding logic required per
operator." Build Oxford as two operator sections (GWR toward London/Reading/Bristol; Chiltern
toward Marylebone), not one flat list — see hazard-pack.md H4/H6 and direction-model-memo.md for
full reasoning.

## Through-running / not-built stations

Five through-running-only points, none are merge/hub candidates at D1:

- **Swindon (SWI)** — GWR main-line continuation, upstream of the Westbury boundary.
- **Banbury (BAN)** — Chiltern (Marylebone branch) + GWR (Paddington–Birmingham via Oxford), two
  TOCs on separate infrastructure at the same town. Not a hub; proposed doNotGroup only if ever
  promoted to a station group.
- **Westbury (WSB)** — boundary to West of England / Solent. GWR (Reading/Oxford) and SWR
  (Southampton/Portsmouth) share the platform, separate franchises. Already flagged reciprocally in
  both those regions' finished packs (`west-of-england-d1/published-network.json`,
  `solent-d1/published-network.json`) — consistent with this pack.
- **Henley-on-Thames (HEY)** — GWR branch, single operator, no through-running.
- **Didcot Parkway (DID)** — GWR main line, Cotswold Line connection point, single operator.

**London Paddington (PAD) and London Marylebone (MYB)** are the two London termini Thames Valley's
GWR/Chiltern services originate from — both belong to London & South East National Rail's catalog,
not Thames Valley's, and neither is built here. Paddington is already a built stationGroup in
`london-se-national-rail-d1/published-network.json`; Marylebone is explicitly **not** built there
either (sits in that pack's `notBuilt.secondary-termini` list). No double-build conflict exists
today for either terminus.

## Direction model recommendation

**Destination + operator** at both hubs — same model as every prior UK National Rail region. At
Oxford, this applies *within* each of the two doNotGroup sections (GWR section, Chiltern section),
not across them. No line+terminus model — neither GWR nor Chiltern brand this corridor with named
lines on a departure board, and inventing them would be guessing. **Illustrative only, not
verified** — no destination strings can be confirmed until `DARWIN_LDB_TOKEN` exists and a real
Darwin payload can be pulled. See direction-model-memo.md for full reasoning and options
considered.

## Skip risk — Chiltern operator transition (20 September 2026)

Chiltern Railways moves from Arriva to DfT Operator on 20 September 2026 (report skip risk 3).
Not a blocker, but a timing flag: whoever wires this adapter on or after that date should verify
Darwin correctly attributes Chiltern services and that any operator/agency mapping (if a GTFS
schedule-source supplement is ever wired) reflects the new operator structure. Flag this in QA if
the wiring date lands close to or after the transition.

## Open items for Tim only — do not resolve

1. **National Rail / OpenLDBWS redistribution terms are ambiguous.** OGL 2.0 baseline permits
   redistribution with attribution, but the Rail Data Marketplace Platform Agreement may restrict
   downstream redistribution to third-party rider clients — the operative clause isn't confirmed
   in public sources. Oracle report confidence: `unclear`. Tim needs to review the signed RDM Data
   Sharing Agreement once EvansAppStudio re-registers and receives a token.
2. **No static GTFS exists directly from NRE for this feed** (Transitland's derived feed is
   reference-only, CC-BY-2.0 UK, not pulled here). Confirm with Tim whether Next Train's
   architecture supports a Darwin-only realtime-board model, or whether a third-party GTFS
   supplement is required before this region can go live at all (independent of the account-level
   token blocker).
3. **Confirm the Oxford doNotGroup shape.** This pack's own judgment call, applying the report's
   explicit language (line 37, 56) rather than inventing a new architecture — but this is the
   first time in this pipeline a *secondary* hub (rather than a primary terminus) has needed an
   internal doNotGroup split, worth an explicit sanity check before Jim wires it.
4. **Chiltern operator transition timing (20 September 2026)** — see skip risk above.
5. **UK country ledger retrofit** — still overdue (no `docs/united-kingdom-ledger.md` exists as of
   this pack, despite being named as required before the next NR region across multiple prior
   regions' packs). Should run before the region after this one, not indefinitely deferred.

## H7 / license summary

Europe/London, HAS DST (BST/GMT). National Rail under OGL 2.0 + NRE amendments (unclear on
third-party redistribution — same open item as every other UK NR region). National Rail static
GTFS (Transitland) is CC-BY-2.0 UK, confidence `clear`, reference-only, not used to derive this
catalog.

## Not done in this pack (by design)

No generator, no assertion tables, no live city flip, no `lib/providers/` or `registry.js` edit,
no GTFS fetch/parse, no invented station-graph or stop-order facts beyond what the report's tables
state, no invented destination strings, no CRS verification against a live feed (Paddington and
Marylebone CRS codes are supplied for identification only, not sourced from either oracle report —
see published-network.json's `crsSource` notes on those two entries), no
`docs/united-kingdom-ledger.md` creation (flagged as overdue, not this pack's job to write), no
wiring of `DARWIN_LDB_TOKEN`, no reading of any other city's in-progress (unfinished) pack — West
of England, Solent, and london-se-national-rail's finished `published-network.json` files were read
only for the specific Westbury/Paddington-Marylebone reciprocal-flag consistency check the dispatch
instruction named, not for general context.
