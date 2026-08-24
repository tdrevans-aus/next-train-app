# Adelaide oracle clash report (D1)

Hand notes. GTFS is **not** the published oracle.

| Id | Clash | Resolution |
|----|--------|------------|
| C-hub | GTFS `stop_name` is often “Adelaide”. Product hub is **Adelaide Railway Station**. | Catalog name locked. Aliases: Adelaide, Adelaide Station. |
| C-ptdock | Some older maps group Port Dock with Outer Harbor. PDF 26 Jan 2026 + `/timetables/ptdock` print it as its **own** TRAIN line. | Seventh line `PTDOCK`. |
| C-tonsley | Legacy “Tonsley line” language; station remains on Flinders. | Not a line. Station sits between Mitchell Park and Flinders. |
| C-osborne | Peak extras terminate at Osborne. | Not a marketing terminus. |
| C-gawler | Intermediate Gawler vs Gawler Central vs Racecourse. | Far printed end = Gawler Central. |
| C-showground | “Adelaide Showground” vs “Showground”. | Use **Adelaide Showground**. |
| C-tram | PDF also shows Glenelg tram. | Out of TRAIN v1. |
| C-gtfs | Public GTFS may use BEL/SEAFRD/… short names or longer headsigns. | D2 line-map is hand-locked from D1, not generated. D6 sweep uses live GTFS without a key. |
| C-auth | Portal mentions optional API gateway key. | H2: public static + RT **need no key**. |

No unresolved clash blocks D5 labels.
