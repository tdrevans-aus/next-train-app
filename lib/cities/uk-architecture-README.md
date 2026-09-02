# UK regions (planned — do not enable)

Per **docs/uk-architecture.md**. Region ids are registry cities — **not** `city=uk`.

| Region id | Catalog | Feed |
|-----------|---------|------|
| `uk-west-midlands` | `lib/cities/uk-west-midlands/stations.json` | Darwin + TfWM Metro |
| `uk-london-tfl` | `lib/cities/uk-london-tfl/stops.json` | TfL Unified API |

Ellesmere Port was never its own region — dropped 2 Sep 2026 as a duplicate concept. Its one
station (ELP) already lives inside `liverpool-city-region`'s Merseyrail Wirral Line catalog.

Adapters:

- `lib/providers/uk-darwin.js` — shared NR (Darwin)
- `lib/providers/uk-metro-wm.js` — West Midlands Metro only
- `lib/providers/uk-tfl.js` — London TfL rail modes only (no Darwin, no buses)

Catalog loader: `lib/providers/uk/catalog.js`

```bash
node qa/uk-region-catalog-conformance.mjs
node qa/uk-planned-gate.mjs
node qa/uk-normalize-etd.mjs
```

Build catalogs:

```bash
node scripts/build-uk-west-midlands-catalog.mjs
TFL_APP_KEY=... node scripts/build-uk-london-tfl-catalog.mjs
```

All UK registry entries stay **`planned`** → `assertCityLive` returns **501**.
