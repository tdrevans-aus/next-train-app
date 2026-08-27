# Amsterdam (GVB metro)

Live for testers. **Not** a public store listing. Separate city `amsterdam` — not `city=nl`.

- Hub: **Centraal Station** (GVB metro print). Do not collapse with NS Amsterdam Centraal. M52 uses deeper platforms at the same hub name.
- v1: metro M50–M54 only. No tram, bus, ferry, NS. Metro does not go to Schiphol.
- Direction: line + terminus (`M54 + Gein`).
- Time zone: `Europe/Amsterdam` (DST).
- Feed: OVapi, no key. Static trimmed GVB metro fixture; RT `https://gtfs.ovapi.nl/nl/tripUpdates.pb`. User-Agent `next-train`.
- Do not generate `published-network.json` from GTFS. Official map lock is `line-map.json`. Luke D1 can follow.
