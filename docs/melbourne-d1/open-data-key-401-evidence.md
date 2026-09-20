# Melbourne — Transport Victoria Open Data key returns 401 (evidence for outreach)

Recorded by the controller session, 2026-09-20 10:53 UTC. No key value appears in this file.

- Account: Transport Victoria Open Data Portal (https://opendata.transport.vic.gov.au), registered by Tim Evans (tdrevans@gmail.com) on 20 Sep 2026.
- Key: the auto-generated key shown under My Account → Profile → API Tokens → **Subscription Keys** ("API Key", Expiry: Never). The value in use was compared character-for-character with the portal page: identical. No Data Platform API Token has been created (not needed for the realtime feeds).
- Request: `GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates` — the server URL and path come from the portal's own OpenAPI file (gtfsr_metro_train_trip_updates.openapi.json). Same result for `.../v1/vline/trip-updates`.
- Header tried: `KeyID: <key>` (as the dataset page and the "How to find your API key" guide state) and `Ocp-Apim-Subscription-Key: <key>` (as the OpenAPI file's securitySchemes state). Also lowercase header name, HTTP/1.1, a browser User-Agent, and Node fetch instead of curl.
- Result, every time, between roughly 2 hours before and at the time above: **HTTP 401**, `Content-Type: application/soap+xml`, 660-byte SOAP fault with subcode `fault:MessageBlocked` (namespace http://www.vordel.com/soapfaults), empty Reason and Detail. A request with NO key header returns the identical 401, i.e. the gateway is not recognising the key at all.
- Calls made: about a dozen in total, well under the documented 24 calls / 60 s limit.
- Context: data.vic.gov.au notice "Changes to how transport APIs are accessed" — the Data Exchange Platform is decommissioned from 30 September and all users must generate a new key on the new portal; support contact given there: PTdataprogram@transport.vic.gov.au.
- Why it matters: Next Train (live on Google Play; Perth, Sydney, Brisbane, Adelaide, Canberra, Gold Coast, Newcastle plus UK/Sweden/Helsinki/Oslo) shows the next departures from a station. Melbourne is the one Australian capital network missing. Two requests for a PTV Timetable API key (11 Aug and 23 Aug 2026 to APIKeyRequest@ptv.vic.gov.au) received no reply, so Melbourne is being built on the Open Data Portal's GTFS Realtime feeds instead.
- Docs discrepancy worth reporting politely: dataset page/guide say header `KeyID`; the OpenAPI files say `Ocp-Apim-Subscription-Key` / query `subscription-key`.
