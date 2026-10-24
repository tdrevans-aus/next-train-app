# Edinburgh Trams direction model memo

One line, two directions, standard line + terminus model. Simplest shape in the pipeline: not a loop (unlike
Glasgow Subway), no branches, no evidenced short-workings. Evidence: oracle report sections 1, 4, 7.

## Tokens

| Direction label | Destination string the API returns (match exactly) | Termini |
|---|---|---|
| `T50 towards Edinburgh Airport` | `Edinburgh Airport` | west |
| `T50 towards Newhaven` | `Newhaven` | east |

The API spells destinations "Newhaven" and "Edinburgh Airport" (probe). Use those strings as the destination
match; the printed label adds the line token. Match case-insensitively and fold diacritics, as the existing
`foldKey` does.

## Direction by stop and platform

- Probe: at Haymarket, platform 1 events are `-> Newhaven` and platform 2 events are `-> Edinburgh Airport`. The
  platform suffix (1 or 2) on the NaPTAN id therefore appears to encode direction. **Do not generalise this to
  other stops without checking**: it is one stop's evidence. Prefer the per-event destination string; use the
  platform suffix only as a cross-check.
- Terminus stops serve one direction only: Edinburgh Airport has only trams towards Newhaven, Newhaven only
  towards Edinburgh Airport. Show a single direction chip, not an empty second one.
- Probe oddity: Newhaven 1 returned four events with destination, sched and pred all null. Treat as "no live data",
  not a direction. The report asks for a Newhaven 2 comparison before concluding which platform is departing.
- Edinburgh Airport 1 events carried `pred` values (567 s and "08:39"); the probe did not record their destination.

## Stop order (west to east, 23 stops)

1 Edinburgh Airport, 2 Ingliston Park & Ride, 3 Gogarburn, 4 Edinburgh Gateway, 5 Gyle Centre, 6 Edinburgh Park
Central, 7 Edinburgh Park Station, 8 Bankhead, 9 Saughton, 10 Balgreen, 11 Murrayfield Stadium, 12 Haymarket,
13 West End, 14 Princes Street, 15 St Andrew Square, 16 Picardy Place, 17 McDonald Road, 18 Balfour Street,
19 Foot of the Walk, 20 The Shore, 21 Port of Leith, 22 Ocean Terminal, 23 Newhaven.

`stationOrderVerified: false` (confidence medium). Source is one search-summarised official list; the official stops
page returned 404. The order matches the geography (longitudes run monotonically east) and the existing catalog's
22-stop order read in reverse, but both ultimately derive from the same report, so it is not independent proof.
Confirm against the API Service/Stop Timetable at wire time. Direction chips do not depend on the order (destination
strings drive them); next-stop and journey-length logic does.

## Same-name hazards that touch direction and station resolution

- **Haymarket, Edinburgh Gateway, Edinburgh Park**: a tram stop and a National Rail station share or nearly share
  a printed name. Resolve by mode (`metro` vs `train`), never by name alone. Chips and boards are separate per mode.
  See `published-network.json` `doNotGroup`.
- **Edinburgh Park Central vs Edinburgh Park Station** are two tram stops. A bare query "Edinburgh Park" must not
  collapse to either tram stop silently; it already also names NR EDP.
- **Forbidden collapse names** (must never resolve as a station): `trams`, `edinburgh trams`, `t50`, `tram`,
  `national rail`, `waverley tram stop`, `edinburgh waverley tram stop`. The last two guard against the removed
  Waverley tram stop re-appearing.
- **Waverley has no tram stop.** A user asking for trams near Waverley gets St Andrew Square / Princes Street as a
  walk suggestion, not a tram board named Waverley.
- **York Place is closed**; it must not resolve, and the old API id answers with 0 events.

## Edinburgh city-level direction model

Unchanged for National Rail (destination + operator, Waverley hub-lock, Haymarket and Slateford satellites). The
tram mode adds line + terminus chips under the same city id. No new city-level direction work.

## Examples (for Jim's gate expectations, derived from the probe, not fabricated)

| Stop | Platform | Expected chip | Source |
|---|---|---|---|
| Haymarket | 1 | `T50 towards Newhaven` | probe, sched 08:05, departuretime 85 |
| Haymarket | 2 | `T50 towards Edinburgh Airport` | probe, sched 08:09 / 08:19 / 08:30 |
| Edinburgh Airport | 1 | single chip, towards Newhaven (destination not recorded in probe; confirm) | probe |

## Open questions

1. Confirm the stop order against the Service/Stop Timetable (G5).
2. Confirm the platform-to-direction mapping at each stop, especially the termini and Newhaven 1 / Newhaven 2.
3. Confirm every T50 runs full length (no Gyle/Ingliston/Picardy Place short-turns).
