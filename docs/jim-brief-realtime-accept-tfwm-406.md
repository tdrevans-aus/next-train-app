# Jim brief — West Midlands Metro down: TfWM answers 406 to the protobuf-only Accept header (7 Sep 2026)

**Dispatched:** 7 Sep 2026 (production sweep follow-up) · **Lane:** platform, shared
`lib/providers/gtfs/realtime.js` (affects every GTFS-RT city) · **Model:** sonnet (pinned; no
override) · **Branch:** `realtime-accept-octet-stream` from master.

## Symptom (production, 7 Sep 2026 09:32 BST)

Every West Midlands Metro request fails:

```
West Midlands Metro GTFS-RT feed request failed: GTFS-RT fetch failed (406) for http://api.tfwm.org.uk/gtfs/trip_updates
```

Reproduces locally with the TfWM keys. Metro was live on production on 6 Sep (verified boards at
Grand Central, Jewellery Quarter (Metro), The Hawthorns (Metro), Five Ways (Metro)).

## Root cause (verified with raw fetches, 7 Sep 2026)

PR #316 (Auckland/Wellington fix) changed the shared default in `lib/providers/gtfs/realtime.js`
to `Accept: application/x-protobuf` **only**, because AT and Metlink answer JSON when
`application/octet-stream` is in the Accept list. TfWM does the opposite: it serves only
`application/octet-stream` and returns `406 application/problem+json` to a protobuf-only header.
No strict single value suits every agency. But #316 also made `decodeFeedMessage` JSON-tolerant,
so the two-value header works everywhere:

| Agency | `Accept: application/x-protobuf` | `Accept: application/x-protobuf, application/octet-stream` |
|---|---|---|
| TfWM `api.tfwm.org.uk/gtfs/trip_updates` | **406** | 200 `application/octet-stream`, protobuf (2.6 MB) |
| AT `api.at.govt.nz/realtime/legacy/tripupdates` | 200 protobuf | 200 `application/json` (wrapped) — decoder handles it |
| Metlink `api.opendata.metlink.org.nz/v1/gtfs-rt/tripupdates` | 200 protobuf | 200 `application/json` — decoder handles it |
| Trafiklab `TripUpdates.pb` (ul) | not tested | 200 `application/octet-stream`, protobuf |
| TransLink SEQ `TripUpdates` | not tested | 200 `application/x-protobuf`, protobuf |

## What to build

1. `lib/providers/gtfs/realtime.js`: default `Accept` becomes exactly
   `application/x-protobuf, application/octet-stream`. Keep the JSON-tolerant decode from #316
   unchanged. Keep per-adapter `options.headers.Accept` overrides working (Canberra, Vancouver
   set their own).
2. `qa/gtfs-realtime-accept.mjs`: update the Accept assertion to the two-value header, and add a
   short "agency compatibility" table in the file header listing which agencies need
   `octet-stream` present (TfWM) and which answer JSON when it is present (AT, Metlink), so the
   next person does not re-break either side. Add an offline assertion that a 406
   `application/problem+json` body throws the existing redacted "GTFS-RT fetch failed (406)" error
   (no key in the message) rather than reaching the decoder.
3. Grep `lib/providers` for any adapter that copied the protobuf-only header since #316 and align
   it.

## Verify

`node --env-file=.env.local qa/uk-west-midlands-dogfood-gate.mjs` (must live-probe TfWM and
pass — it failed on this 406 during PR #339's run), `qa/auckland-dogfood-gate.mjs`,
`qa/wellington-dogfood-gate.mjs` (both retired since #338 but their adapters must still decode;
run them in their retired form), `qa/gtfs-realtime-accept.mjs`, `qa/brisbane-dogfood-gate.mjs`,
`qa/canberra-dogfood-gate.mjs`, `qa/malmo-dogfood-gate.mjs`, `qa/live-city-lists-sync.mjs`. Direct
`fetchMetroStopBoard("Grand Central", { regionId: "uk-west-midlands" })` must return trips. Do not
run the full smoke suite locally (port 3000 is held by an unrelated dev server); rely on CI. Open a
normal PR with the table above in the description. Do not merge it.
