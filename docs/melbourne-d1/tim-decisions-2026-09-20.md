# Melbourne — Tim's decisions, 20 Sep 2026

Recorded by the controller session from Tim's replies in chat. These close the "Open §3 questions
for Tim" in `direction-model-memo.md` and two of the hazard-pack open items.

## Copy decisions (direction labels)

1. **Loop vs direct.** Loop trains get a suffix on the direction label: **"via City Loop"**.
   Direct trains are **unlabelled** (no "direct" wording). The suffix is derived live from the
   trip's own stop sequence (never a time-of-day table, never a timetable fallback) and is shown
   only where it changes what the rider sees next — Flinders Street, Southern Cross and the three
   City Loop stations (Flagstaff, Melbourne Central, Parliament). No new chip/tag UI element.
2. **"Metro Tunnel" is not a rider-facing line name or qualifier.** Labels are
   `Sunbury Line` / `Cranbourne Line` / `Pakenham Line` + terminus, matching the official line
   picker. Every train on those lines uses the tunnel, so "via Metro Tunnel" disambiguates
   nothing. Revisit only if a Melbourne tester reports confusion about trains that skip
   Flinders Street.
3. **Dandenong fork (Cranbourne vs Pakenham).** No special visual treatment. Line + terminus
   already separates them; the requirement is that the terminus is **never blank** for a train
   on this spine — the gate must fail on a bare `Sunbury Line` / blank-terminus label.

## Verification items (not decisions — facts to be checked, Tim agreed to the approach)

4. **Maryborough / Ararat / Echuca V/Line reservation status** — settle from V/Line's own
   reservations page (Nico). Compulsory reservation ⇒ `out-reservation`; otherwise `in`. No
   `out-product` ruling requested.
5. **"Union" and the station graph.** The oracle report's doNotGroup note put Union on the
   Pakenham/Cranbourne lines; the controller believes Union is a real station on the
   **Belgrave/Lilydale** line (opened 2023, replacing Surrey Hills and Mont Albert), and found
   `published-network.json` both omits it and lists Camberwell–Box Hill out of order. Reconcile
   **every** line's station list and order against the official Victorian GTFS static feed
   (`stops.txt` / `stop_times.txt`, public download, no key); the published map stays the
   tie-breaker. Jim must not build on the graph until this is done.
