# Fukuoka hazard pack (H1-H7)

Evidence: official EN route information https://subway.city.fukuoka.lg.jp/eng/route/ (retrieved 2026-09-06); official JP sister page https://subway.city.fukuoka.lg.jp/route/ ; official route map PDF (EN) https://subway.city.fukuoka.lg.jp/eng/route/deta/map.pdf (200, application/pdf, 4.6 MB, Adobe Illustrator — bytes not parsed, ordering taken from the station list); MovEasy Service terms https://fukuoka-city-subway.jorudan.biz/pc/en/termsofuse ; Nico oracle-clash-report.md 2026-09-06.

## H1 - parent + child

D1 has no stopIds — there is **no official public GTFS** for Fukuoka City Subway to key any parent/child platform structure against (Transitland: no Onestop ID; Mobility Database `feeds_v2.csv`: 0 rows; ODPT membership list does not include Fukuoka City Transportation Bureau). The hazard here is **name-family**, not feed hierarchy, same shape as Osaka's H1.

doNotGroup: **Hakata** (metro hub K11 x N18) vs **JR Hakata** (separate mainline / Shinkansen facility, different operator, different ticketing — same city block, not the same station); **Tenjin** (K08, Kuko only) vs **Tenjin-Minami** (N16, Nanakuma only, underground-linked via Tenjin Chikagai but a distinct station) vs **Nishitetsu Fukuoka (Tenjin)** (different private-rail network, Nishitetsu Tenjin-Omuta Line); **Nakasu-Kawabata** (K09 x H01, Kuko-Hakozaki interchange, not a three-line hub) vs **Hakata** (the actual three-...two-line hub — see H4). **Hakata** is the metro lock string — keep it.

### Internal report inconsistency (flag for Nico, not resolved here)

The oracle report carries two different code assignments for the same stations in two different sections:

- The prose **"Station name table"** (oracle-clash-report.md rows ~30-41) gives: Hakata K11, Meinohama K01, Fukuoka Airport K13, Tenjin **K05**, Tenjin-Minami N16, Nakasu-Kawabata **K03**/H07, Kaizuka H01, Hashimoto N01, Kushida Shrine N17, Higashi-Hie K12, Gion K10, Akasaka **K04**.
- The dated **"Station roster (D1 transcription, 6 Sep 2026)"** section (oracle-clash-report.md rows ~91-149), which carries its own EN/JP per-station sourcing and is the section the build brief points to, gives: Tenjin **K08**, Nakasu-Kawabata **K09**/H01, Akasaka **K07**, Kaizuka **H07** (not H01), Hashimoto N01, Kushida Shrine N17, Hakata N18.

These two sections cannot both be right — e.g. the prose table has Nakasu-Kawabata as both K03 and (via Hakozaki) H07/Kaizuka's own code, while the roster has Nakasu-Kawabata as K09/H01 and Kaizuka separately as H07. **This pack uses the dated roster section as canonical** (it is the section explicitly labelled as the D1 transcription, carries individual station-level Wikipedia/official cross-references, and its own arithmetic — 13+7+18=38 ticks, 36 unique names — self-checks). The prose table's codes should be treated as stale and corrected at the report source; do not carry them into an adapter. Flagging back to Nico rather than silently picking one.

The report header also states "62 line ticks" (line 44) where the roster's own count is 38 (13+7+18) for 36 unique names. This pack uses 38/36, per the roster's own arithmetic section. Also flagged back to Nico.

## H3 - thin / event / overlay

- **No Nishitetsu, no JR mainline/Shinkansen, no bus/tram/ferry in v1.** Official route information lists only the three subway lines. Nishitetsu Fukuoka (Tenjin) / Tenjin-Omuta Line and JR Hakata (mainline, Shinkansen, Tokaido/Sanyo/Kyushu) share city blocks with metro stations but are separate operators — out of v1 line-graph, and out-mode at board eligibility.
- **JR Chikuhi through-run at Meinohama is a board-eligibility inclusion, not a v1 line-graph node.** Chikuhi mutual-operation trains call at the Fukuoka City Subway K01 platform and continue west to Karatsu / Nishi-Karatsu. Those west-of-Meinohama stations have no K-codes and are not transcribed anywhere in this pack — do not add them as v1 nodes even though the operating rider is `in` at Meinohama.
- **No official public GTFS or GTFS-RT.** The rider site (https://subway.city.fukuoka.lg.jp/) shows schedule info but publishes no developer feed. A community GTFS exists on GitHub (kuwayamamasayuki/GTFS-FukuokaCitySubway) — explicitly **not** used as a D1 source per the oracle report; do not treat it as official.

## H4 - branches (doNotGroup candidates)

| node | branches | evidence |
| --- | --- | --- |
| Hakata | Kuko (K11) + Nanakuma (N18) | Official rider site lists Hakata as the Kuko/Nanakuma transfer point |
| Nakasu-Kawabata | Kuko (K09) + Hakozaki (H01) | Official rider site interchange, not the hub |
| Tenjin | Kuko (K08) only | Official rider site — no Nanakuma tick at this stop |
| Tenjin-Minami | Nanakuma (N16) only | Official rider site — no Kuko tick at this stop; underground-linked to Tenjin, not the same station |
| Meinohama | Kuko terminus (K01) + JR Chikuhi mutual operation | Oracle report v1 cut section: through-running boundary, board-eligibility `in`, line-graph node ends here |
| Hakata (city block) | Metro Hakata (K11/N18) vs JR Hakata (mainline/Shinkansen) | Oracle report hub-lock section: separate facility, doNotGroup |

No city-loop or "to City" passenger code found on the official route information. Inbound/outbound framing does not apply cleanly at Hakata, which is a two-line interchange (Kuko x Nanakuma), not a single-end terminus for either line — Kuko continues past it to Fukuoka Airport, Nanakuma terminates there (N18 is the Nanakuma east end, opened 27 March 2023).

## H5 - nested short turns

No official nested codes. Three passenger line tokens: **K, H, N** (Kuko, Hakozaki, Nanakuma). `shortTurns` empty on all three lines — no partial-route service found on the official route information.

## H6 - inner city (where §3 lives)

Locked set: **Hakata** (K11 x N18). Shared approaches: Nakasu-Kawabata (K09 x H01, Kuko-Hakozaki, not Hakata), Tenjin (K08, Kuko only), Tenjin-Minami (N16, Nanakuma only, underground-linked to Tenjin but a different station).

Hakata is a **two-line interchange**, and unlike Osaka's Hommachi it is also a genuine terminus for one of the two lines meeting there (Nanakuma N18, east end since the March 2023 extension) while Kuko runs through it (K11, between Gion and Higashi-Hie). Direction framing at Hakata therefore needs line + terminus for Kuko (through) and is simpler for Nanakuma (terminates there) — see direction-model-memo.md. JR Hakata (separate facility) is never the metro direction target.

## H7 - DST

**Asia/Tokyo does not observe DST.** Do not copy Europe/Stockholm, UK, or Australia/Sydney DST handling. Wall-clock is Japan standard time year-round, matching Osaka/Tokyo precedent.

## doNotGroup proposals

| candidate | reason |
| --- | --- |
| fukuoka vs city=fuk / fukuoka-metro / fukuoka-city / merge into another JP city | Separate city id; agency Fukuoka City Transportation Bureau |
| Hakata (metro) vs JR Hakata | Hub lock vs separate mainline/Shinkansen facility — different operator, different ticketing |
| Tenjin vs Tenjin-Minami | Two distinct metro stations (Kuko-only vs Nanakuma-only), underground-linked but not the same platform |
| Tenjin / Tenjin-Minami vs Nishitetsu Fukuoka (Tenjin) | Different private-rail operator (Nishitetsu Tenjin-Omuta Line), shares only the area name |
| Nakasu-Kawabata vs Hakata | Both are interchanges but Nakasu-Kawabata is Kuko-Hakozoki only, not the three-... two-line hub |
| Meinohama (K01) vs JR Chikuhi stations west of Meinohama | Board-eligibility `in` at the in-catalog platform; west-of-Meinohama Chikuhi stations have no K-code and are out of v1 entirely |
| ODPT / Transitland / community GitHub GTFS vs this city | No official public feed; community GTFS explicitly not used as a D1 source |

## What I did not do

No generator, no live city flip, no edit to any other city's pack, no reopen of Osaka/Tokyo Japan-lane work, no invented ODPT zip, no invented GTFS from the community GitHub repo, no version bump, no public store listing, no resolution of the two internal report code-table conflicts (flagged above for Nico, not guessed at).
