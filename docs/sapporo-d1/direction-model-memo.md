# Sapporo direction model memo (§3 for Tim)

Context (2026-09-06): **hub-and-spoke through a single locked three-line node**, not a through-trunk
puzzle like Osaka's Hommachi. Ōdōri is the only station where all three in-scope lines
(Namboku/N, Tōzai/T, Tōhō/H) meet; Sapporo and Susukino are secondary two-line nodes (Namboku +
Tōhō only, no Tōzai). No official "to City" / "to Downtown" / inbound-outbound convention is
reported anywhere in the oracle report — the city map prints line + terminus.

## Recommendation

**Line + official terminus** (example: `Namboku + Makomanai`, `Tōzai + Miyanosawa`), matching the
Osaka/Copenhagen-family precedent already used for every linear line in this pipeline.

Use the official English terminus name for the direction token. Use **Ōdōri** only as the hub
*stop* string, never as a direction token. At Ōdōri the useful pair is line + suburban end, same
pattern as Osaka's Hommachi (see `docs/osaka-d1/direction-model-memo.md`).

D1 locks these six terminus strings from the oracle report:

- Namboku: **Asabu** (north) / **Makomanai** (south)
- Tōzai: **Miyanosawa** (west) / **Shin-Sapporo** (east)
- Tōhō: **Sakaemachi** / **Fukuzumi**

The oracle report's station roster (added 2026-09-06) now enumerates all 49 stations across the
three lines, so every intermediate chip name is also available in `published-network.json`'s
`stations`/`stationCodes` arrays. **Do not treat that roster as final for product edits yet** —
its source is Wikipedia, not the official city site, and must be cross-checked against
https://www.city.sapporo.jp/st/subway/ and the 2020 GTFS stops.txt first (see hazard-pack.md and
coverageGaps in `published-network.json`).

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Namboku + Makomanai; Tōzai + Shin-Sapporo | Matches official single-letter line tokens + English terminus names; no compass ambiguity | Needs the full official terminus list confirmed (have it: 6 names, both ends of all 3 lines) |
| **B. Terminus only** | Makomanai; Shin-Sapporo | Shorter | At Ōdōri three lines would collapse to bare suburb names with no line family — loses the N/T/H token riders see on platform signage |
| **C. Compass (N/S/E/W)** | Northbound / Southbound | Simple | Not an official printed convention anywhere in the oracle report; Tōzai runs west/east, Tōhō is diagonal (Sakaemachi–Fukuzumi) — compass labels don't map cleanly and risk inventing a scheme the city doesn't use |

## §3 examples (illustrative — not D5)

Assume model A. Locked hub stop string **Ōdōri**.

### Ōdōri (Namboku + Tōzai + Tōhō)

| train | label |
| --- | --- |
| Namboku north | Namboku + Asabu |
| Namboku south | Namboku + Makomanai |
| Tōzai west | Tōzai + Miyanosawa |
| Tōzai east | Tōzai + Shin-Sapporo |
| Tōhō (toward Sakaemachi) | Tōhō + Sakaemachi |
| Tōhō (toward Fukuzumi) | Tōhō + Fukuzumi |

### Sapporo (H4; Namboku + Tōhō only, no Tōzai)

Namboku + Asabu / Makomanai, Tōhō + Sakaemachi / Fukuzumi. **doNotGroup vs JR Sapporo** — JR
Hokkaido services at the separate JR Sapporo station are out of catalog entirely, not just out of
the direction model.

### Susukino (H4; Namboku + Tōhō only, no Tōzai)

Same pair as Sapporo. No JR co-location reported here, but keep the doNotGroup discipline in case a
future pass finds one.

### Shin-Sapporo (Tōzai eastern terminus)

Tōzai + Miyanosawa only as a v1 chip (the direction *toward* Miyanosawa, since Shin-Sapporo is
itself the terminus). **doNotGroup vs JR Shin-Sapporo** (Chitose Line) — separate station,
underground-passage-connected only.

## Open §3 questions for Tim

1. **Full station/terminus chip list is now transcribed** (all 49 stations, with official
   N01-N16/T01-T19/H01-H14 codes, per the oracle report's roster added 2026-09-06). The remaining
   open item is that the roster's source is Wikipedia, not the official city site — it needs
   cross-checking against https://www.city.sapporo.jp/st/subway/ and the 2020 GTFS stops.txt
   before any D2 adapter work treats it as final for a per-station allow-list. See
   `published-network.json` `coverageGaps` and `jim-handoff.md`.
2. Spoken/printed line token: official single letter (**N / T / H**) vs full English name
   (**Namboku Line** / **Tōzai Line** / **Tōhō Line**) vs both together. Rec (pending full
   transcription): **{Namboku, Tōzai, Tōhō} + official EN terminus**, matching the Osaka recipe of
   full line name + terminus rather than bare letter.
3. Hub far-end string: never invent "City" / "Downtown" — none is printed anywhere in the source
   material for Sapporo, and inventing one would repeat the exact mistake flagged in the Osaka
   memo for Hommachi.
4. Whether testers see Sapporo as its own city picker entry (yes — do not fold into a generic
   Hokkaido or Japan bucket; oracle report explicitly warns against inventing `sms` /
   `sapporo-metro` or merging into another Hokkaido city).
5. Whether the 2020 GTFS, if refreshed, would use exactly these same terminus strings — not
   assumed here; re-verify at D2 per hazard-pack.md H7.
