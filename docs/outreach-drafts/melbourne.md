# Melbourne Open Data Portal outreach — Tim Evans to send

## Email

**To:** PTdataprogram@transport.vic.gov.au

**From:** tdrevans@gmail.com

**Subject:** Open Data Portal GTFS Realtime key — 401 Unauthorized; header name unclear

---

Hi,

I've registered a new subscription key on the Transport Victoria Open Data Portal (account registered 20 Sep 2026) and am testing the GTFS Realtime endpoints for Melbourne. The key returns HTTP 401 with a SOAP fault (subcode `fault:MessageBlocked`) from both endpoints:
- `GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/metro/trip-updates`
- `GET https://api.opendata.transport.vic.gov.au/opendata/public-transport/gtfs/realtime/v1/vline/trip-updates`

I've tried both the `KeyID` header (as your dataset page states) and `Ocp-Apim-Subscription-Key` header (as the OpenAPI files specify), plus lowercase variants. Notably, a request with no key header returns the identical 401 response, suggesting the gateway isn't recognizing the key at all.

Two quick questions:

1. Does a newly generated subscription key need an activation or subscription step before the gateway will accept it?
2. Which header name is actually correct for these endpoints — `KeyID` or `Ocp-Apim-Subscription-Key`?

For context: Next Train shows the next departures from major stations and is live on Google Play across Australia and the UK. Melbourne is the missing Australian capital.

Happy to supply request details, exact timestamps (calls around 2026-09-20 10:53 UTC), User-Agents, or anything else you need.

Thanks,  
Tim Evans  
tdrevans@gmail.com

---

## Notes for Tim

- **Support address source:** PTdataprogram@transport.vic.gov.au is given in the data.vic.gov.au notice "Changes to how transport APIs are accessed" (Data Exchange Platform decommissioning 30 Sep 2026).
- **Fallback contact:** Transport Victoria Open Data Portal has a Help-and-Support contact form at https://opendata.transport.vic.gov.au if you need to escalate or if this address bounces.
- **Optional PS (only add if you want to mention the earlier attempts):** You may wish to add this PS to the email: "Note: we also submitted two requests for a PTV Timetable API key to APIKeyRequest@ptv.vic.gov.au on 11 and 23 August 2026, both of which remain unanswered. The Open Data Portal is our current path forward for Melbourne."

---

**Word count (body):** 176 words (excluding greeting/signature)

---
**Sent:** 20 Sep 2026 by the controller session at Tim's request, from tdrevans@gmail.com to PTdataprogram@transport.vic.gov.au (Gmail thread 1a0be7d816b5e3cb). Sent text = the draft above with "major stations" → "a station" and the AEST time added; optional PS not included.
