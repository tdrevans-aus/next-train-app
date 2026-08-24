# Adelaide D1 research pack (Luke)

**City:** `adelaide` stays **planned**. Do not flip live.  
**Perth / Sydney / Brisbane live-gates:** do not touch.  
**`assertCityLive("adelaide")`:** must still fail after D2–D6.  
**No generator. No PR.**

Retrieved **2026-08-23**. TRAIN only.

---

## Sources (independent of GTFS)

| Oracle | URL / edition |
|--------|----------------|
| Official rail PDF | Adelaide Metro train and tram network map, **26 January 2026** (index: [network maps](https://www.adelaidemetro.com.au/plan-a-trip/network-maps)) |
| BEL | https://www.adelaidemetro.com.au/timetables/bel |
| SEAFRD | https://www.adelaidemetro.com.au/timetables/seafrd |
| FLNDRS | https://www.adelaidemetro.com.au/timetables/flndrs |
| GAWC | https://www.adelaidemetro.com.au/timetables/gawc |
| OUTHA | https://www.adelaidemetro.com.au/timetables/outha |
| PTDOCK | https://www.adelaidemetro.com.au/timetables/ptdock |
| GRNG | https://www.adelaidemetro.com.au/timetables/grng |
| H2 feeds | https://gtfs.adelaidemetro.com.au/v1/static/latest/google_transit.zip · `/v1/realtime/trip_updates` |

Hand file: `qa/fixtures/adelaide/published-network.json`. Never regenerate from GTFS.

---

## Locks

| Topic | Lock |
|-------|------|
| Hub | **Adelaide Railway Station** (aliases Adelaide / Adelaide Station only) |
| Printed TRAIN lines | **7:** Belair, Seaford, Flinders, Gawler, Outer Harbor, **Port Dock**, Grange |
| Port Dock | Seventh printed line (`PTDOCK`), not a variant of Outer Harbor |
| Tonsley | Station on Flinders. **Not a line** |
| Osborne | Peak/event Outer Harbor working. **Not a printed terminus** |
| Gawler far end | **Gawler Central**. Gawler Racecourse is event-only |
| Modes v1 | TRAIN. No tram, bus, Glenelg |
| H2 | Public GTFS + GTFS-R. **No key required** (optional `ADELAIDE_METRO_API_KEY`) |
| H7 | `Australia/Adelaide` **has DST**. Do not copy Brisbane no-DST |

---

## H-notes

- **H2** — Public zip + trip_updates work without `x-api-key` (verified 2026 on the existing adapter). Optional gateway key is not a blocker.
- **H3** — Gawler Racecourse / Oval specials and Osborne extras must not become extra chips.
- **H4** — Branches: Woodlands Park (Seaford vs Flinders); Woodville (Grange vs Outer Harbor / Port Dock); Alberton (Outer Harbor vs Port Dock); Goodwood (Belair vs Seaford/Flinders).
- **H6** — Hub is Adelaide Railway Station. Every printed line calls here.
- **H7** — DST. Leave-by must use `Australia/Adelaide`, not Brisbane.

---

## §3 recommendation (locked)

**Line + terminus.** Example: **Belair line Belair**.

Not Perth terminus-only. Adelaide has no T-numbers; chips are `{line name} {far terminus}`.

At Adelaide Railway Station that is seven chips:

1. Belair line Belair  
2. Seaford line Seaford  
3. Flinders line Flinders  
4. Gawler line Gawler Central  
5. Outer Harbor line Outer Harbor  
6. Port Dock line Port Dock  
7. Grange line Grange  

City-bound chips use **Adelaide Railway Station** as the terminus string.
