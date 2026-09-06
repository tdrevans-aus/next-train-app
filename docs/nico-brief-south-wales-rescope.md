# Nico brief — South Wales re-scope: bring the walk-up National Rail network into catalog

**Date:** 7 Sep 2026 · **Owner:** Tim · **Lane:** research (Nico) → then Luke, Jim, Mark per CLAUDE.md.
**Dispatch:** `subagent_type: nico`. Output file: rewrite the Board eligibility and catalog-scope sections of `docs/south-wales-d1/oracle-clash-report.md` (keep the rest, add a dated "Re-scope 7 Sep 2026" section at the top explaining what changed and why).

## Problem
`lib/cities/south-wales/stations.json` has **two** stations: Cardiff Central (CDF) and Severn Tunnel Junction (STJ). Its notes say Transport for Wales "Valley Lines" are deliberately excluded because "no confirmed public GTFS static or GTFS-RT feed of any kind exists for it". Tim (6 Sep 2026): from a rider's perspective a region with two stations looks broken.

The premise to test: the Valley Lines and the rest of the South Wales network are **National Rail heavy-rail stations with CRS codes**, served by TfW trains that appear on Darwin OpenLDBWS like every other UK station. If so, no separate feed is needed and the walk-up rule (`docs/board-eligibility-rule.md`) requires them in catalog. The South Wales Metro tram-train conversion (Core Valley Lines, from 2025 onward) changes rolling stock, not Darwin coverage — verify whether Darwin still lists departures at converted stations (e.g. Cardiff Queen Street CDQ, Pontypridd PPD, Treherbert TRB, Merthyr Tydfil MER, Aberdare ABA, Rhymney RHY).

## Do
1. Confirm against Darwin (as `docs/jim-brief-uk-crs-sweep-2.md` did — a live OpenLDBWS probe; `DARWIN_LDB_TOKEN` is in `.env.local`, use the existing `lib/providers/uk-darwin.js` helper via a small node one-liner) that boards exist for at least: CDQ, PPD, NWP (Newport), SWA (Swansea), BGN (Bridgend), BRI (Barry Island), PEN (Penarth), CAE (Caerphilly), MER, ABA, TRB, RHY, NTH (Neath), PTA (Port Talbot Parkway), CMN? — no: Carmarthen (CMN) and Llanelli (LLE) are **Rest of Wales's** per `docs/united-kingdom-ledger.md` §2 stop ownership; do not claim them. Check the ledger's coverage boundary for South Wales (§4) and propose the boundary explicitly (suggest: Swansea westward is the boundary; Swansea in South Wales, Llanelli in Rest of Wales — confirm against the ledger, don't invent).
2. Produce the Board eligibility table for the region: every operator seen at those boards (TfW, GWR, CrossCountry) with a verdict (`in` for walk-up; `out-reservation` only for compulsory-reservation services if any). No `undecided` rows.
3. Recommend the v1 catalog: hub lock Cardiff Central; secondary hub Cardiff Queen Street; whether Central/Queen Street need `doNotGroup` (they are ~600 m apart, separate stations — recommend two plain entries, not a group, unless Darwin shows them merged); Newport, Swansea, Bridgend, Barry Island, Penarth, Caerphilly, Pontypridd, Merthyr Tydfil, Aberdare, Treherbert, Rhymney, Neath, Port Talbot Parkway, Severn Tunnel Junction, plus any other station with regular walk-up service you find (aim for the ~25 busiest, not every halt). Give CRS codes for each, marked `crsVerified` only when the live probe returned a board.
4. Note lat/lng source for Luke: NaPTAN RailReferences by CRS (what Liverpool's pack used), so the pack ships coordinates (Near me auto-nearest needs them — PR #318).
5. Record what the old exclusion got wrong in one paragraph, so the same mistake doesn't recur in another region.

## Don't
Don't touch `stations.json`, the provider, or the registry — that's Luke's and Jim's work after this report. Don't backfill Rest of Wales's pack; cross-region facts go to the ledger's propagation log.
