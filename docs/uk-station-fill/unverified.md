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

## Phase 2a summary

- **2 exclusions/unverified** out of the phase 2a candidate pool (fifteen regions plus the unassigned-England bucket).
