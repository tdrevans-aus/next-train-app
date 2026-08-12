# Melbourne (PTV) metro station catalog

Dogfood catalog for `lib/providers/melbourne.js`. **Not** wired to product UI.

- `stopId` is the PTV Timetable API v3 stop identifier (metro train).
- Requires server env `PTV_DEVID` + `PTV_API_KEY` (never client / git).

Register: email `APIKeyRequest@ptv.vic.gov.au` — subject `PTV Timetable API – request for key`.

Sources:

- API base: https://timetableapi.ptv.vic.gov.au
- Departures: `GET /v3/departures/route_type/0/stop/{stop_id}`
