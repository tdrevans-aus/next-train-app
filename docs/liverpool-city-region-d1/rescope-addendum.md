# Liverpool City Region — full-network rescope addendum (4 Sep 2026)

**For:** Jim, Mark, Tim
**From:** Luke
**Reads:** `docs/luke-brief-liverpool-full-network-rescope.md` (Tim's brief), the original
`docs/liverpool-city-region-d1/oracle-clash-report.md` (Nico, unchanged), `lib/cities/
liverpool-city-region/stations.json` (this rescope's own output)
**Supersedes:** the 6-station D1 pack this folder previously described, and the flip PR built on
it (`#194`) — see "PR #194 must be superseded, not merged" below.

## Previous count vs new count

| | previous (D1 pack, 1–2 Sep 2026) | new (this rescope, 4 Sep 2026) |
| --- | --- | --- |
| National Rail | 2 (Liverpool Lime Street, Liverpool South Parkway) | 29 |
| Merseyrail | 4 (Liverpool Lime Street, Liverpool Central, Moorfields, Ellesmere Port) | 69 |
| **Total** | **6** | **98** |

The previous 6-station catalog was a leftover from when Ellesmere Port was being scoped as its own
thin test-corridor region (`uk-ellesmere-port`, deleted 2 Sep 2026 — see `docs/uk-architecture.md`)
and never actually expanded once that plan changed, despite the oracle report itself flagging this
as unresolved (report line 19: "Verify station count during D1 pack stage; do not assume all 96 are
in-scope" — that verification never happened until now).

## Sourcing — corrected from the brief's assumption

The brief (`docs/luke-brief-liverpool-full-network-rescope.md`, section 2) suggested checking
whether the DFT Bus Open Data no-key bulk GTFS archive pull (South Yorkshire/North East precedent)
was reusable here. **It is not** — that precedent is for bus/light-rail operator GTFS, not National
Rail, and does not carry a Liverpool City Region National Rail station list. What was actually
reusable, and used, is the **West Midlands precedent**: ORR Table 6329.

- **National Rail (29 stations):** [ORR Table 6329, "Station attributes for all mainline stations,
  Great Britain, as at 31 March 2026"](https://dataportal.orr.gov.uk/statistics/infrastructure-and-environment/rail-infrastructure-and-assets/table-6329-station-attributes-for-all-mainline-stations/),
  filtered to `Combined authority = Liverpool City Region`. Same table, same method West Midlands'
  75-station catalog used (`registry.js`/hazard-pack precedent cited in the brief itself).
- **Merseyrail (69 stations):** the same ORR 6329 table, filtered to `Station facility owner =
  Merseyrail`, plus three stations individually confirmed by the oracle report but not carrying
  that facility-owner value in the table: Chester (Wirral Line terminus, TfW Rail-owned facility,
  report line 21), and Liverpool Lime Street's own Merseyrail presence (Network Rail-owned
  facility, report lines 41/73). This reaches the oracle report's own confirmed 69-station total
  (report line 21: "Merseyrail adds 67 stations (managed)" plus the two non-Merseyrail-owned
  stations above — see hazard-pack.md H3 for the exact reconciliation).
- **Coordinates (all 98 stations):** NaPTAN `RailReferences.csv` (CRS → ATCO code) joined against
  the NaPTAN access-nodes CSV (ATCO → lat/lng) — the same method `scripts/lib/uk-naptan.mjs` uses
  for West Midlands. This closes the "lat/lng null for every station" gap the original 6-station
  pack's own file header flagged.

## What could not be sourced — Northern Line vs Wirral Line membership

Per the brief's section 3 escalation path: **not everything was sourceable without new web
research, and this is flagged rather than guessed.**

ORR Table 6329 has no route/line column — it lists stations, facility owners, and local authority
districts, not which Merseyrail line(s) call at each station. Transitland's REST API (the source
that would carry `stop_times`/`routes` to derive line membership) returned 401 Unauthorized on
every attempt; the public feed browse page for `f-gc-rail~delivery~group~planar~gtfs` has no
no-key static bulk-download link, only the API, and no `TRANSITLAND_API_KEY` (or equivalent) is
available in this environment.

**Consequence:** of the 69 Merseyrail stations, only the ones the oracle report individually names
carry a line assignment: Liverpool Central and Moorfields (dual-line interchange, both lines),
Southport, Ormskirk, and Headbolt Lane (Northern Line termini), and Ellesmere Port, West Kirby, and
Chester (Wirral Line termini). The remaining **~60 Merseyrail stations have no `line` field in
`stations.json`** — this pipeline does not infer Northern vs Wirral membership from geography,
borough, or station name. See `hazard-pack.md`'s H3 for the full record of this gap; **do not
resolve it by inference at wiring time** — it needs either a Transitland API key or a different
line-membership source (e.g. a public Merseyrail line-diagram PDF transcribed by a human, or
Nico being looped back in for a short, scoped follow-up per the brief's escalation path).

## doNotGroup Lime Street treatment — still holds at 98 stations

Liverpool Lime Street remains built as **two separate stationGroups** (mode `train`, mode `metro`),
`doNotGroup: true` between them — unchanged by this rescope. The H1 structural ambiguity this
decision was built on (report contradicts itself on "platform level," line 41, vs "separate
infrastructure, separate entrance/footbridge," line 73/C2-C3 point 2) is a fact about Lime Street
specifically, not about catalog size — going from 6 to 98 stations does not create or resolve any
new evidence about that one station's structure. `stations.json`'s two Lime Street entries (train
mode, `crs: "LIV"`; metro mode, `catalogId: "merseyrail:liverpool-lime-street"`) carry the same
doNotGroup reasoning text as the original D1 pack. Verified: `node
qa/uk-region-catalog-conformance.mjs`'s `liverpool-city-region` block asserts both entries resolve
distinctly by mode and neither collapses into the other.

## Merseyrail `out-product` board-eligibility verdict — still holds at 98 stations

Unchanged. The verdict (corrected 2 Sep 2026 from an earlier, incorrect `in` — see the oracle
report's Board eligibility section and `published-network.json`'s `notes`) is about the *feed*, not
the *station count*: `fetchMerseyrailStopBoard()` throws `MerseyrailFeedUnconfirmedError`
unconditionally because no confirmed public GTFS-RT endpoint exists for Merseyrail at all, for any
station. Going from 4 named Merseyrail stations to 69 does not change that — no station in the
larger catalog has a board any more than the 4 originally-named ones did. Confirmed:
`qa/liverpool-city-region-dogfood-gate.mjs` still asserts the Merseyrail board fetch throws
`MerseyrailFeedUnconfirmedError` for stations across the expanded catalog.

## PR #194 must be superseded, not merged

The currently-open `#194` (or whatever the live flip PR is now called) was built against the
6-station catalog and the pre-rescope `stations.json`. **Do not merge it as-is.** Once Jim's
adapter rewiring pass against this 98-station catalog is done and Mark re-QAs, a fresh flip PR
should supersede it. This is restated in `jim-handoff.md`.
