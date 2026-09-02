# Liverpool City Region direction model memo (§3)

Context **today (1 Sep 2026)**: two agencies (National Rail's seven TOCs, Merseyrail's
Northern/Wirral Lines), one contested structural question (Lime Street's Merseyrail relationship,
see hazard-pack.md H1), and one genuinely open v1-scope decision the report left pending. This
memo makes that scope call and records the direction model for whichever agencies end up in v1.

## V1 scope decision: National Rail + Merseyrail, Merseyrail schedule-only

**Decision: Option A — include Merseyrail in v1, schedule-only, not Option B (the report's own
recommendation to defer Merseyrail entirely).**

### Why this departs from the report's own recommendation (lines 33, "Recommendation")

The report's headline recommendation is to scope v1 to National Rail only and defer Merseyrail to
H2, reasoning that this "keeps v1 scope manageable" while the account-unlock path (Darwin token) is
pending. That reasoning conflates two independent blockers that don't actually compound:

1. **National Rail is blocked at the account level** (DARWIN_LDB_TOKEN), not at the catalog level.
   The catalog/adapter can and should be built now regardless — same posture every other UK region
   this wave has taken (report itself says "build normally," lines 90, 110).
2. **Merseyrail's real-time status is unconfirmed**, but its *static* schedule data is confirmed
   live (Transitland `f-gc-rail~delivery~group~planar~gtfs` includes Merseyrail, verified
   2026-08-31, report lines 12, 22). A confirmed static feed with unconfirmed real-time is exactly
   the shape this pipeline has already shipped twice this wave: Greater Manchester's Metrolink (8
   lines, 99 stops, schedule-only pending TfGM) and South Yorkshire's Supertram (schedule-only
   pending SYPTE/SYFTL). Deferring Merseyrail entirely, rather than shipping it schedule-only,
   would be inconsistent with that precedent without a reason specific to Merseyrail that
   distinguishes it — the report doesn't give one.

Merseyrail is also not a minor addition: 69 stations across Northern and Wirral Lines is a larger
network than the ~30–40 National-Rail-only station count the report itself estimates for this
region (line 125). Deferring it to H2 would ship a Liverpool City Region catalog that excludes the
majority of the region's rail network and both of its named Merseyrail hub stations (Liverpool
Central, Moorfields) — for a reason (real-time uncertainty) that this pipeline's own precedent
treats as a schedule-only condition, not an exclusion condition, everywhere else it's come up.

**Board eligibility supports inclusion, not exclusion:** the report's own board eligibility table
(line 84) verdicts Merseyrail `in` — walk-up, no reservation system, no check-in barrier, both
tests pass cleanly. Per `docs/board-eligibility-rule.md`, an in-scope, board-eligible service
should not be silently left off the catalog; deferring the whole mode to H2 without a feed-status
reason distinct from Metrolink's or Supertram's would be the kind of silent-omission failure mode
that rule exists to prevent.

**What this decision does not do:** it does not promise real-time Merseyrail data. Merseyrail
boards ship schedule-only, exactly as the report's own Option A describes, pending confirmation
from Merseyrail (merseyrail.org / data@merseyrail.org per report line 112) of a public GTFS-RT
feed. If Merseyrail confirms no such feed will ever exist, this pack's schedule-only posture is
already the correct steady state, not a placeholder.

## Architecture: two agencies, National Rail hub+secondary-hub pair, Merseyrail's own interchange pair, structurally separate at Lime Street

**Decision:**

- **National Rail**: hub lock = **Liverpool Lime Street (LIV)**, secondary hub = **Liverpool South
  Parkway (LPY)**.
- **Merseyrail**: interchange pair = **Liverpool Central** and **Moorfields** (both Merseyrail
  dual-line interchange stations, report lines 50–51; report does not rank one over the other, so
  neither is built as sole hub lock — see hazard-pack.md H6).
- **Liverpool Lime Street's Merseyrail presence** is built as a **separate stationGroup**,
  `doNotGroup: true` against the National Rail Lime Street stationGroup — the conservative reading
  of the report's contradictory "platform level" (line 41) vs "separate infrastructure, separate
  entrance/footbridge" (line 73, C2/C3 point 2) language. See hazard-pack.md H1 for the full
  reasoning; this is flagged, not confirmed, and should be revisited once a walk-distance/time
  figure is available.

### Why Lime Street is not modelled as one shared-building hub the way Manchester Victoria is

Manchester Victoria's report gave an explicit distance/time figure for its cross-mode connection
("escalator/lift... ~2–5 minutes," one shared concourse) that justified building it as one
stationGroup with an internal doNotGroup layer. This report gives no equivalent figure for Lime
Street, and two of its three mentions of the relationship use "separate infrastructure" language
rather than "same building" language. Building Lime Street as two separate stationGroups (rather
than one shared entry) is the safer default under that ambiguity — it never risks silently merging
two operators' boards the way a single stationGroup with a mislabelled doNotGroup flag could.

## Merseyrail direction model: line + terminus (metro-style)

Same convention as the pipeline's other fixed-route rail/light-rail products (Rotterdam, Newcastle,
Boston, East Midlands NET, South Yorkshire Supertram, Greater Manchester Metrolink): **line +
terminus**. Two lines, per the report (lines 21, 44):

| line | termini |
| --- | --- |
| Northern Line | Liverpool — Southport / Ormskirk / Headbolt Lane (three branches) |
| Wirral Line | Liverpool — Ellesmere Port / West Kirby / Chester (three branches) |

The report gives termini/branch summary only (report line 21) — **not** a full 69-stop ordered
intermediate list (only Liverpool Central, Moorfields, and Ellesmere Port are individually named,
report lines 50–52). Real gap, same shape as Metrolink's 99-stop gap and Supertram's station-order
gap; see coverageGaps in `published-network.json`. Do not treat the `stations` fields as complete.

**Example (illustrative, Merseyrail only):**

### Liverpool Central (Merseyrail interchange)

`Northern Line + Southport`, `Northern Line + Ormskirk`, `Northern Line + Headbolt Lane`,
`Wirral Line + Ellesmere Port`, `Wirral Line + West Kirby`, `Wirral Line + Chester`. (Whether all
six branch destinations call at Central specifically, versus splitting across Central/Moorfields,
is not confirmed by the report — do not assume all six without a real timetable check.)

## National Rail direction model: destination + operator, no printed line map

Same model as every prior UK National Rail region (East Midlands, South Yorkshire, West Yorkshire,
Thames Valley, West of England, Solent, london-se-national-rail, Greater Manchester): Darwin
departure boards are destination lists, not printed line maps. No `lines` array is provided for
National Rail — see `published-network.json`.

- **Liverpool Lime Street:** destination + operator (Northern Trains / Avanti West Coast /
  TransPennine Express / East Midlands Railway / Transport for Wales / West Midlands Trains /
  CrossCountry) distinguishes services. No evidence in the report of doNotGroup-worthy
  platform-mixing complexity among the seven NR operators themselves — single flat board,
  `doNotGroup: false` among the seven, per report board eligibility table lines 63–67
  (doNotGroup applies only against the Merseyrail layer at the same station name, per H1/H4/H6).
- **Liverpool South Parkway:** destination + operator, secondary hub; airport connector role noted
  but not modelled as a separate mode (report line 42 — no airport rail-link operator distinct from
  National Rail is named).

### No §3 examples table for National Rail

Consistent with every prior UK NR region's posture: destination strings would need a real Darwin
payload, which is blocked (account-level, see coverageGaps in `published-network.json`). Do not
fabricate destination strings such as "London Euston (Avanti West Coast)" as verified facts —
illustrative shape only, not written into `published-network.json` as confirmed data.

## Options considered

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. National Rail + Merseyrail (schedule-only), two separate agency structures, Lime Street split into two stationGroups** (built) | NR: Lime Street hub, South Parkway secondary. Merseyrail: Central/Moorfields interchange pair, schedule-only boards. Lime Street's NR and Merseyrail presence built as two doNotGroup'd stationGroups. | Matches board-eligibility `in` verdict for Merseyrail; consistent with Metrolink/Supertram schedule-only precedent; doesn't leave 69 stations and 2 named hubs out of the catalog for a reason (real-time uncertainty) this pipeline already treats as non-exclusionary elsewhere | More stationGroups and a genuinely unresolved structural question (Lime Street) to carry forward |
| **B. National Rail only, Merseyrail deferred to H2 (report's own literal recommendation)** | Only Lime Street + South Parkway + NR regional/City Line stations in v1 | Matches the report's headline recommendation literally; smaller v1 surface | Excludes the majority of the region's rail network and both named Merseyrail hubs for a reason (real-time uncertainty) that Metrolink and Supertram both shipped through as schedule-only rather than exclusion; inconsistent precedent without a Merseyrail-specific reason the report doesn't supply |
| **C. Merge Lime Street's NR and Merseyrail presence into one stationGroup (assume "platform level" language, line 41, is correct)** | One combined "Liverpool Lime Street" entry for both agencies | Simpler board if the relationship really is one building | Contradicted by two of the report's own three mentions of the relationship (line 73, C2/C3 point 2); risks silently merging two operators' boards if the true relationship is actually a walk-link pair |

## Open items for Tim

1. **Confirm the National Rail + Merseyrail (schedule-only) v1 scope decision** before Jim wires an
   adapter — this pack deliberately departs from the oracle report's own headline recommendation
   (Option B, defer Merseyrail); worth an explicit sanity check given the divergence. See
   reasoning above.
2. **Lime Street/Merseyrail structural relationship is unresolved** (hazard-pack.md H1) — the
   report gives contradictory "platform level" vs "separate infrastructure/footbridge" language
   and no distance/time figure. Confirm with a site check, station operator documentation, or a
   live Darwin/Merseyrail response before Jim wires the adapter's station graph.
3. **Merseyrail real-time feed status is unknown** — confirm with Merseyrail (merseyrail.org /
   data@merseyrail.org) whether a public GTFS-RT feed exists or is planned before assuming
   schedule-only is permanent.
4. **National Rail / OpenLDBWS redistribution terms are ambiguous.** Same open item as every other
   UK National Rail region. Review the signed RDM Data Sharing Agreement once EvansAppStudio
   re-registers.
5. **Ellesmere Port registry discrepancy — resolved 2 Sep 2026.** `uk-ellesmere-port` was deleted
   as a standalone region (never a real one); this pack's Wirral Line terminus entry is unaffected
   and is the only remaining reference.
6. **Liverpool Central vs Moorfields ranking** — report names both as "dual-line interchange" with
   no ranking between them, unlike Metrolink's explicit St Peter's Square-over-Victoria ranking.
   If a real ranking exists, it is not sourced in this report; confirm before treating one as senior
   to the other.
7. **UK country ledger retrofit is still overdue** — no `docs/united-kingdom-ledger.md` exists as
   of this pack. The Lime Street structural ambiguity recorded here is exactly the kind of
   cross-region fact that ledger should hold once it exists.
