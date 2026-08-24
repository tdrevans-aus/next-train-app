# Tim — Adelaide sideload (debug APK only)

**City status:** `planned` — **not live**. Do not flip Adelaide, Sydney, or Brisbane. Perth stays green.

**Done when:** debug APK + `npm run dev` + `ALLOW_CITY_PROBES=1` can probe Adelaide TRAIN boards locally. Production `/api/next-train?city=adelaide` stays **501**. `/api/dev/board` on Vercel stays **404**.

Chips: **line + terminus** (`Belair line Belair`). Hub is **Adelaide Railway Station**. Port Dock is a seventh printed line. Tonsley is not a line.

Public GTFS + GTFS-R need **no key**. Time zone `Australia/Adelaide` (DST).

Do **not** set `ALLOW_CITY_PROBES` on Vercel. Leave Melbourne/Canberra out of the picker.

## Gates

- `node qa/adelaide-dogfood-gate.mjs`
- `node qa/adelaide-line-map-conformance.mjs` (offline)
- Live sweep (not CI): `npm run sweep:adelaide`
