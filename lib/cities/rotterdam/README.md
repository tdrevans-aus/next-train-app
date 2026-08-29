# Rotterdam (RET metro)

Live for testers. **Not** a public store listing. Separate city `rotterdam` — not `amsterdam`, not `city=nl`, not `the-hague`.

- Hub: **Beurs** (all five RET metro lines). Not Rotterdam, not CS, not Centraal Station.
- v1: metro A–E only. No tram, bus, waterbus, NS. Do not leak GVB M50–M54.
- Rotterdam Centraal is a D terminus / E through-stop. doNotGroup metro vs NS.
- Den Haag Centraal is a Metro E stop on this city.
- Direction: line + terminus (`Metro A + Binnenhof`). A does not go to Nesselande.
- Time zone: `Europe/Amsterdam` (DST).
- Feed: OVapi, no key. Static trimmed RET metro fixture; RT `https://gtfs.ovapi.nl/nl/tripUpdates.pb`. User-Agent `next-train`.
- D1 oracle: `qa/fixtures/rotterdam/published-network.json` (copied from `docs/rotterdam-d1/`). Do not generate that file from GTFS.
