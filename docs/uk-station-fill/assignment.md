# UK station fill phase 1 — region assignment

Companion to `docs/jim-brief-uk-station-fill-phase1.md`. Records the rule actually applied and
every borderline call, per the brief's instruction ("ledger consistency is what Mark gates on").

## Scotland: edinburgh / glasgow / rest-of-scotland

**Method.** Every one of the 363 Scottish stations in the candidate dataset
(`docs/uk-station-fill/source.md`) not already in one of the three catalogs was reverse-geocoded
(OpenStreetMap Nominatim) to a UK council area, then bucketed:

- **Glasgow** if the council area is one of: Glasgow City, East Renfrewshire, Renfrewshire,
  Inverclyde, East Dunbartonshire, West Dunbartonshire, North Lanarkshire, South Lanarkshire,
  East Ayrshire, North Ayrshire, South Ayrshire — the Strathclyde (former SPT) footprint named in
  the brief's assignment rule.
- **Edinburgh** if the council area is one of: City of Edinburgh, East Lothian, Midlothian,
  West Lothian — the brief's "commuter stations into Waverley" footprint. Fife stations (Fife
  Circle, north of the Forth) are never in this set, so they fall through to rest-of-scotland
  automatically, matching the brief's explicit carve-out.
- **Rest of Scotland**: everything else.
- **Falkirk High** (Falkirk council area, in neither set by council) is special-cased to Edinburgh
  per `docs/united-kingdom-ledger.md` section 2 (Tim, 5 Sep 2026 — "Edinburgh's boundary station,
  Edinburgh–Glasgow via Falkirk High is Edinburgh's flagship commuter corridor").

**Borderline call: the Ayrshire coast boundary.** The brief's rule reads "Ayrshire (to Ayr/Largs)"
— read literally, this bounds Glasgow's Ayrshire footprint at Ayr, not the whole of South
Ayrshire council (which also contains Maybole, Girvan and Barrhill, further south toward
Stranraer). Council-area geocoding alone would have put all of South Ayrshire in Glasgow,
including that sparser long-distance-only tail. Applied instead: Ayr, Prestwick, Troon, Barassie
and Newton-on-Ayr (the frequent, electrified Glasgow–Ayr suburban service) stay Glasgow;
**Maybole, Girvan and Barrhill moved to rest-of-scotland** as the sparser, non-suburban corridor
beyond Ayr. Largs (North Ayrshire/Inverclyde area) has no equivalent further-out tail, so no
similar cut was needed there.

**Falkirk High** is now a real catalogued station in Edinburgh's list (previously excluded/
`notInRegion` pending the ledger ruling — the ruling has since landed, this pass just acts on it).

**Robroyston (glasgow, RRN)** and **Kintore (rest-of-scotland, KTR)** are missing from the NaPTAN
`RailReferences.csv` snapshot pulled 13 Sep 2026 (both post-date whatever snapshot the fallback
source currently serves — Robroyston opened 2008, Kintore reopened 2020). Darwin-verified and
shipped; coordinates come from the candidate dataset instead of NaPTAN for these two only, see
`docs/uk-station-fill/source.md`.

**Two rail/other-mode doNotGroup collisions found and recorded** (same printed name, different
mode, genuine interchange stations — not merged, kept as two distinct catalog entries per the
existing pattern at Waverley/Haymarket and Buchanan Street/Queen Street):
- Edinburgh: **Edinburgh Gateway** — National Rail (new, EGY) vs Trams (existing). Added to
  `lib/cities/edinburgh/tram-directions.js` `DO_NOT_GROUP_PAIRS`.
- Glasgow: **Partick** — National Rail (new, PTK) vs Subway (existing). Added to
  `lib/cities/glasgow/subway-directions.js` `DO_NOT_GROUP_PAIRS`.

**Caledonian Sleeper — not extended.** Per the brief, `excludeOperators` was not added to any
newly-shipped station without direct evidence the Sleeper calls there. The existing four
exclusions (Aberdeen, Inverness, Fort William, Mallaig) are untouched. Real-world Sleeper calling
points that plausibly need the same treatment but are **not actioned here** (flagged for whoever
next touches Caledonian Sleeper board eligibility, with a live Darwin filtered-board check before
adding): Stirling, Perth, Pitlochry, Blair Atholl, Dalwhinnie, Aviemore, Carrbridge (Highland
portion, Perth–Inverness); Crianlarich, Rannoch, Corrour (West Highland/Fort William portion).

## East Midlands

**Method.** Every station in the candidate dataset within a generous bounding box around the six
named counties was reverse-geocoded to a council/unitary-authority name, then kept only if:
1. its CRS is not already catalogued in any other UK region's `stations.json` (checked against
   all 19 GB region catalogs' train CRS lists), and
2. its council/unitary-authority name is one of: Nottinghamshire, Derbyshire, Leicestershire,
   Northamptonshire, Rutland, Lincolnshire.

**Bug caught before shipping: Northamptonshire's 2021 unitary reorganisation.** Reverse-geocoding
returns "North Northamptonshire" and "West Northamptonshire" (the post-2021 unitary authorities),
never the bare county name "Northamptonshire" — the first classification pass used only the
literal county name and silently dropped four real, unowned, in-county stations (Corby, Kings
Sutton, Long Buckby, Northampton) into the out-of-county exclusion pile. Caught on review, county
set corrected to include both unitary names, all four re-verified live against Darwin and shipped
(all OK — COR, KGS, LBK, NMP).

**Borderline call: Kings Sutton (KGS).** Sits on the Chiltern Banbury–Oxford–Marylebone corridor,
geographically closer to Thames Valley's Banbury/Oxford territory than to Nottingham. Checked
Thames Valley's own catalog and `docs/united-kingdom-ledger.md` section 2 — neither claims it.
Administratively it is West Northamptonshire, inside this brief's named county list, and adding
it creates no cross-region conflict (no other region catalogs it). Shipped to East Midlands per
the letter of the rule; flagged here in case Thames Valley's next catalog touch has a stronger
claim.

**Already-owned exclusions checked and left untouched** (not reassigned, per the brief): every
West Midlands station in the bounding box (Birmingham-area stations reach into the box's western
edge), Cambridge/Ely/Kings Lynn/Peterborough (Greater Anglia), Banbury (Thames Valley),
Huddersfield/Denby Dale (West Yorkshire), and South Yorkshire's Darton/Meadowhall/Moorthorpe/
Rotherham Central/Sheffield/South Elmsall. Chesterfield and Alfreton were already in East
Midlands' own catalog (per `docs/united-kingdom-ledger.md`'s "Chesterfield deliberately excluded
— East Midlands' station, not South Yorkshire's" note) — untouched, not re-added.

**Tamworth (TAM)** stays excluded from this catalog, unchanged — still West Midlands' per the
ledger; this brief does not touch West Midlands' own catalog.

**doNotGroup collision found and recorded:** **Hucknall** — National Rail (new, HKN) vs NET tram
(existing terminus). East Midlands has no structural `DO_NOT_GROUP_PAIRS` array (unlike
Edinburgh/Glasgow) — the existing pattern here (see Nottingham Station's own entry) is a prose
note on each entry's `class` field, which this follows.

**Naming collision, not a data problem:** Netherfield's CRS code is **NET**, the same letters used
throughout this pack as shorthand for Nottingham Express Transit (the tram operator). No functional
collision — CRS codes and mode/operator abbreviations are different fields, never compared to each
other — but noted here in case a future prose pass conflates them.
