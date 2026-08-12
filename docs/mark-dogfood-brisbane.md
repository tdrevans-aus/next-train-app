# Mark — Brisbane dogfood (dev board)

**City status:** `planned` — **not live** in the app.  
**Tim:** set Vercel env `ALLOW_CITY_PROBES=1` before Mark tests.

Replace `HOST` with preview or production (e.g. `https://next-train-app.vercel.app`).

---

## Three stations to try

| Station | URL |
|---------|-----|
| Central | `GET HOST/api/dev/board?city=brisbane&station=Central` |
| Roma Street | `GET HOST/api/dev/board?city=brisbane&station=Roma%20Street` |
| South Bank | `GET HOST/api/dev/board?city=brisbane&station=South%20Bank` |

**List catalog:** `GET HOST/api/dev/board?city=brisbane&list=1`

---

## Pass / fail

| Check | Expect |
|-------|--------|
| Without `ALLOW_CITY_PROBES=1` | **404** (endpoint hidden) |
| `tripCount` during service hours | ≥ 1 |
| Each trip | `liveDeparture`, `destination`; optional `platform` |
| `cityStatus` in JSON | `planned` |

**Still blocked (correct):**  
`/api/next-train?city=brisbane&station=Central&direction=…` → **501**

---

## Monitoring

**Do not** add UptimeRobot / synthetic checks for Brisbane until Tim enables the city live.  
Perth monitors only: `/api/health` + optional Perth `next-train` (see `docs/go-live-ops.md`).

---

## Local (Tim / Jim)

```powershell
$env:ALLOW_CITY_PROBES="1"
npm start
curl "http://localhost:3000/api/dev/board?city=brisbane&station=Central"
```
