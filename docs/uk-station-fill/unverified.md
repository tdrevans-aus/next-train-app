# UK station fill phase 1 — excluded / unverified candidates

Companion to `docs/jim-brief-uk-station-fill-phase1.md`. Every candidate that reached live Darwin
verification but failed it, per the brief's rule: "A CRS that returns an HTTP error, or a station
whose Darwin `locationName` doesn't match the dataset name, is excluded and listed here, not
shipped."

## rest-of-scotland

| Station | CRS | Council | Result | Notes |
|---|---|---|---|---|
| Connel Ferry | CON | Argyll and Bute | **excluded** — Darwin returns 404 | Retried twice (initial sweep + isolated retry with cache bypass), both 404. Connel Ferry closed to passengers in 1966; the building survives as a private residence/heritage site. The candidate dataset carries it as if open — it is not. Genuine closure, not a transient probe failure. |

## east-midlands

| Station | CRS | Council | Result | Notes |
|---|---|---|---|---|
| Bingham | BIN | Nottinghamshire | **excluded** — Darwin returns 404 | Retried twice (initial sweep + isolated retry with `noCache: true`), both 404. Unlike Connel Ferry, this is **not** a known closure — Bingham is a real, open, EMR-served station on the Nottingham–Skegness line (confirmed via NaPTAN's own RailReferences entry for BIN, and the neighbouring stations Bleasby/Carlton/Netherfield/Radcliffe/Rolleston all resolved fine against Darwin in the same sweep). Flagged as a genuine RDM/Darwin API gap for this one station, not guessed around — a future re-check (or a support query to RDM) may resolve it without a code change. |

## Transient failures, resolved on retry (not excluded)

Two candidates hit a transient Darwin/RDM error on the first pass and were retried before this
list was finalised — recorded here for completeness, not exclusions:

| Station | CRS | Region | First result | Retry result |
|---|---|---|---|---|
| Prestwick International Airport | PRA | glasgow | flagged by the strict name-matcher — Darwin's `stationName` is "Prestwick Intl Airport" | accepted on manual review as the same station (Darwin's standard abbreviation, same pattern as other UK regions' printed-name variants) |
| Stewarton | STT | glasgow | Darwin LDBWS 503 (temporarily unavailable) | 200 OK on retry ~20s later |

## Summary

- **2 genuine exclusions** (Connel Ferry — closed station; Bingham — live 404 gap, not a closure),
  both out of 449 total candidates verified across the four regions (363 Scotland + 100 East
  Midlands, after the Northamptonshire county-name correction in `assignment.md`; two of those
  100 were duplicate — 96 in the first pass + 4 Northamptonshire ones added after the correction).
- **0 name mismatches** beyond the one accepted abbreviation variant (Prestwick).
- Every other candidate probed against Darwin returned a 200 with a matching `locationName` and
  is shipped with `crsVerified: true`.

# UK station fill phase 2a — excluded / unverified candidates

Companion to `docs/jim-brief-uk-station-fill-phase2a.md`. Same rule as phase 1: a CRS that returns
an HTTP error, or a station whose Darwin `stationName` doesn't match the candidate name, is
excluded and listed here, not shipped. Includes candidates that would otherwise have landed in
one of the fifteen regions' catalogs or in `unassigned-england.md`.

## unassigned-england

| Station | CRS | Result | Notes |
|---|---|---|---|
| Bingham | BIN | **excluded** — Darwin LDBWS returned 404 |  |
| Parton | PRN | **excluded** — Darwin LDBWS returned 404 |  |

## Name-variant candidates accepted on manual review (phase 2a)

`docs/uk-station-fill/assignment.md`'s "Per-region counts" section said phase 2a's manual review
accepted 20 name-mismatch candidates as abbreviation/punctuation variants (same pattern as phase
1's Prestwick review) without itemising them. Itemised here (14 Sep 2026, UK station fill phase
2b tidy-up, docs/jim-brief-uk-station-fill-phase2b.md addendum): every station carrying an
`accepted on manual review` note in a phase 2a `stations.json` `class` field, with the dataset
name, Darwin's own name, and the CRS.

| Region | CRS | Candidate dataset name | Darwin's own stationName |
|---|---|---|---|
| london-se-national-rail | CIR | Caledonian Road & Barnsbury | Caledonian Rd & Barnsbury |
| london-se-national-rail | CSD | Cobham & Stoke Dabernon | Cobham & Stoke d'Abernon |
| london-se-national-rail | HXX | Heathrow Terminals 2 & 3 Rail | Heathrow Airport T123 |
| london-se-national-rail | HAF | Heathrow Terminal 4 Rail | Heathrow Airport T4 |
| london-se-national-rail | HWV | Heathrow Terminal 5 Rail | Heathrow Airport T5 |
| london-se-national-rail | RHM | Reedham (London) | Reedham (Surrey) |
| west-of-england | PRI | Portway Park & Ride | Portway Park and Ride |
| greater-manchester | MUF | Manchester United Football Club | Manchester United FC |
| north-east | MCE | Metrocentre | Metro Centre |
| north-east | NOP | Northumberland Park (Tyne and Wear) | Northumberland Park (T&W) |
| solent | BXW | Box Hill & Westhumble | Boxhill & Westhumble |
| solent | BMY | Bramley (Hants) | Bramley (Hampshire) |
| solent | MBK | Millbrook (Hants) | Millbrook (Hampshire) |
| south-wales | PPL | Pontypool and New Inn | Pontypool & New Inn |
| south-wales | RIA | Rhoose Cardiff Airport | Rhoose Cardiff Intl Airport |
| south-wales | WHT | Whitchurch (Cardiff) | Whitchurch (Glamorgan) |

**Only 16 of the 20 claimed in `assignment.md` could be itemised this way** — a full-repo search
for every phase 2a `stations.json`'s `accepted on manual review`/`abbreviation/punctuation
variant` class-field text finds exactly these 16 across six regions (london-se-national-rail x6,
solent x3, south-wales x3, north-east x2, greater-manchester x1, west-of-england x1); the other
nine phase 2a regions (east-midlands, uk-west-midlands, south-yorkshire, west-yorkshire,
rest-of-wales, rest-of-scotland, thames-valley, liverpool-city-region, greater-anglia, cumbria,
southwest) carry none. `assignment.md`'s "20" is not reconciled against this count — flagged as a
discrepancy for whoever next touches phase 2a's own records, not guessed around here.

## Phase 2a summary

- **2 exclusions/unverified** out of the phase 2a candidate pool (fifteen regions plus the unassigned-England bucket).
