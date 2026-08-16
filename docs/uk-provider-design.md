# UK provider design — Darwin OpenLDBWS (build, do not enable)

**Status:** Spike only — **blocked until AU product is live**  
**Owner:** Tim (product)  
**Related:** `docs/multi-city-provider-design.md` · `lib/providers/contract.js` · `lib/providers/uk-darwin.js`  
**Data source:** [National Rail Darwin LDB Webservice (Public)](https://www.nationalrail.co.uk/developers/darwin-data-feeds/)

---

## 1. Launch gate (read this first)

UK is **country 2**, not another AU capital. Do **not** wire it into production paths until Perth (and the AU launch you care about) is live.

| Action | Until AU live | After AU live |
|--------|---------------|---------------|
| `lib/providers/uk-darwin.js` | ✅ Keep as spike / iterate | Harden + test |
| `lib/cities/uk/stations.json` | ✅ Seed catalog only | Expand + coords for Near me |
| `lib/providers/registry.js` | ❌ **No UK entry** | Add `uk` with `status: "planned"` |
| `/api/next-train?city=uk` | ❌ Must stay **404/501** | Flip registry to `live` when ready |
| `lib/dev-city-board.js` | ❌ **Not registered** | Add fetcher + `ALLOW_CITY_PROBES=1` dogfood |
| App UI / city picker | ❌ | Product decision |
| National Rail attribution | N/A | Required in settings / about |

**Single line rule:** code may exist in the repo; **nothing user-facing may call UK**.

---

## 2. Why Darwin (not TransportAPI / Realtime Trains)

| Option | Verdict |
|--------|---------|
| **Darwin OpenLDBWS (PV)** | **Recommended for v1** — same data as station boards; free to ~5M requests / 4-week period; fits leave-by + upcoming departures |
| TransportAPI | Paid convenience wrapper over Darwin + static data; good if you want REST-only and faster first ship |
| Realtime Trains | Excellent API; **£99/mo** commercial tier — overkill for a leave-by board |

Darwin matches the existing provider contract: station board → `ProviderTrip[]` → shared `buildNextTrainResponse`.

---

## 3. Shared contract mapping

App input (unchanged):

| In | UK source |
|----|-----------|
| `station` | CRS code or catalog name → `crs` |
| `direction` / `destination` | Destination CRS → `filterCrs` + `filterType: "to"` |
| `leaveBeforeMinutes` | Shared math on `liveDeparture` |
| `timeZone` | `Europe/London` |

Darwin call for a saved journey (e.g. Reading → Paddington):

```text
GetDepartureBoard
  crs: "RDG"
  filterCrs: "PAD"
  filterType: "to"
  numRows: 10
  timeWindow: 120   // minutes — Darwin default window
```

Alternative for “next to one of several terminals”:

```text
GetNextDepartures
  crs: "RDG"
  filterList: ["PAD", "MYB", …]   // up to 25 CRS codes
```

Adapter output (`lib/providers/contract.js`):

| `ProviderTrip` | Darwin field |
|--------------|--------------|
| `scheduledDeparture` | `std` → UK-local ISO |
| `liveDeparture` | `normalizeEtd(std, etd)` |
| `displayTime` / `scheduledDisplayTime` | HH:MM in `Europe/London` |
| `platform` | `platform` when `platformAvailable === true` |
| `destination` | `destination[].locationName` (join multiples with `" and "`) |
| `cancelled` | `isCancelled` or `etd === "Cancelled"` |
| `status` | `"Delayed"`, `"On time"`, `delayReason`, etc. |

---

## 4. `etd` normalisation (main adapter logic)

Darwin times are **strings**, not always `HH:MM`:

| `etd` value | Leave-by behaviour |
|-------------|-------------------|
| `On time` | Use `std` as live departure |
| `HH:MM` (optional `*`) | Use that time; `*` = unreliable |
| `Delayed` | Show delayed; use `std` as weak estimate unless a time appears later |
| `Cancelled` | Skip trip or surface cancelled state |
| `No report` | Fall back to `std` |

Implemented in `normalizeEtd()` in `lib/providers/uk-darwin.js`. Unit-test this before enabling.

**Overnight:** If parsed departure is >30 minutes in the past (UK local), roll to next calendar day.

---

## 5. UK-specific product quirks

| Quirk | Handling |
|-------|----------|
| Split / join trains | Multiple `destination` entries — display combined label; filter by `filterCrs` on API side |
| `filterLocationCancelled` | Service shown but not stopping at filter destination — exclude from direction match |
| Platform suppressed | Honour `platformAvailable: false` — hide platform in UI |
| Bus replacement | `serviceType` — v1 trains only (`serviceType` P default) |
| 2-hour window | Fine for commute; no “tomorrow 07:15” without Staff LDB or static DTD |
| CRS not station name | Catalog maps name ↔ CRS; Near me needs lat/lng in catalog |
| Attribution | OGL + National Rail brand guidelines — link in About when live |

Direction aliases (same idea as Perth `lineGroups`):

```json
"destinationGroups": {
  "London Paddington": ["Paddington", "London Paddington"]
}
```

---

## 6. Architecture

```text
lib/cities/uk/stations.json          CRS catalog + aliases + coords (seed)
        ↓
lib/providers/uk-darwin.js         SOAP → ProviderTrip[]  (spike today)
        ↓
buildNextTrainResponse (unchanged)   leave-by / next / upcoming
        ↓
/api/next-train                      NOT wired until launch gate cleared
```

### Env (server only)

| Variable | Purpose |
|----------|---------|
| `DARWIN_LDB_TOKEN` | Rail Data Marketplace / OpenLDBWS access token |

Register at [Rail Data Marketplace](https://www.nationalrail.co.uk/developers/darwin-data-feeds/) → **LDB Webservice (PV)**.  
Longer term: prefer the marketplace **JSON** product over hand-rolled SOAP when docs are stable.

### SOAP endpoint (spike)

- WSDL: `https://lite.realtime.nationalrail.co.uk/OpenLDBWS/wsdl.aspx?ver=2021-11-01`
- POST: `https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb6.asmx`
- Token in SOAP header `AccessToken` / `TokenValue`

---

## 7. Spike module (`lib/providers/uk-darwin.js`)

Exports:

- `normalizeEtd(std, etd, now?)` — pure; safe to import in tests
- `fetchStationBoard(stationIdOrName)` — all departures for CRS (no direction filter)
- `fetchDepartureBoard({ crs, filterCrs?, filterType?, numRows? })` — low-level
- `listCatalogStations()` — seed catalog names

**Not exported to:** registry, `train-times.js`, `dev-city-board.js`, or the client.

### Manual probe (dev machine only)

```bash
# Set token from Rail Data Marketplace, then:
node --input-type=module -e "
  import { fetchDepartureBoard } from './lib/providers/uk-darwin.js';
  const board = await fetchDepartureBoard({ crs: 'RDG', filterCrs: 'PAD', numRows: 5 });
  console.log(JSON.stringify(board, null, 2));
"
```

---

## 8. Enable checklist (after AU live)

Use this as the only “pull the trigger” list:

- [ ] AU product live (your definition — store listing / paid users / whatever you locked)
- [ ] `DARWIN_LDB_TOKEN` in Vercel env (production + preview policy decided)
- [ ] `normalizeEtd` fixtures / tests green
- [ ] `stations.json` covers your dogfood routes (family/friends commutes)
- [ ] Add `uk` to `lib/providers/registry.js` as `planned`, `adapterReady: true`
- [ ] Register in `lib/dev-city-board.js`; verify with `ALLOW_CITY_PROBES=1`
- [ ] Wire `train-times.js` / server handler for `?city=uk`
- [ ] National Rail attribution in About / settings
- [ ] Rate limit + short server cache (30s refresh × users ≪ 5M/4 weeks)
- [ ] Flip `status: "live"` only when UI + store copy ready

---

## 9. Cost sanity check

30s refresh ≈ 2 requests/min/user while app is foregrounded.

| Active UK users (1h/day) | Requests / month (rough) |
|--------------------------|--------------------------|
| 50 | ~180k |
| 500 | ~1.8M |
| 2,000 | ~7.2M (approach Darwin high-volume tier) |

Server-side caching per `(crs, filterCrs)` for 15–30s cuts this sharply.

---

## 10. Out of scope for v1

- Journey planner / multi-leg routing
- Fares, ticket retail, seat reservations
- Full UK station gazetteer (2,500+ stations)
- Staff LDB / Push Port / DTD timetable ingestion
- iOS/Android UK-specific store listings

---

## Version history

| Date | Change |
|------|--------|
| 2026-08-16 | Initial design + gated `uk-darwin.js` spike |
