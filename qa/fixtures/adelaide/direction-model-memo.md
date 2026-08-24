# §3 direction model — Adelaide (Luke pack)

**Status:** locked for D5 (Tim brief 2026-08-23)  
**Model:** **line + terminus** (`Belair line Belair`)

---

## Why not Perth-style terminus-only

All seven printed TRAIN lines reverse at **Adelaide Railway Station**. Terminus-only chips at the hub would be seven suburb names with no line. Line + terminus matches Adelaide Metro printed names (BEL / SEAFRD / FLNDRS / GAWC / OUTHA / PTDOCK / GRNG) without inventing T-numbers.

| Model | Hub example | Use? |
|-------|-------------|------|
| **Line + terminus** | Belair line Belair | **Yes** |
| Terminus only | Belair | No — loses line at the hub |
| Inbound / outbound | Outbound · Belair | No — every line is radial from the same hub |

---

## Locked display rules

| Topic | Use | Do not use |
|-------|-----|------------|
| Hub identity | Adelaide Railway Station | Bare “Adelaide” as the catalog name |
| Belair | Belair line Belair | Belair as a line-less chip |
| Seaford | Seaford line Seaford | Noarlunga Centre as a far chip |
| Flinders | Flinders line Flinders | **Tonsley line** |
| Gawler | Gawler line Gawler Central | Gawler / Gawler Racecourse as extra far chips |
| Outer Harbor | Outer Harbor line Outer Harbor | Osborne as a printed terminus |
| Port Dock | Port Dock line Port Dock | Fold into Outer Harbor |
| Grange | Grange line Grange | Henley Beach (closed) |
| City-bound | `{line} Adelaide Railway Station` | “City” / “Adelaide Station” as the chip |

`shortTurnGroups` stays empty. Do not collapse opposite radial ends.

---

## What Jim does / does not

| Do | Don't |
|----|-------|
| Hand-lock D2 line-map from this pack | Add `scripts/build-line-map.mjs --city=adelaide` |
| D5: seven hub chips; Port Dock present; Tonsley not a line | Flip `adelaide` live |
| D6 live sweep off CI | Touch Perth / Sydney / Brisbane live-gates |
| H2 no-key public GTFS | Require `ADELAIDE_METRO_API_KEY` |
| H7 DST | Copy Brisbane no-DST |
