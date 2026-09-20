# Production board horizon + latency sweep — 20 Sep 2026 (~12:15 UTC, Sunday)

Run by the controller session after Tim noticed Brussels boards reach only ~10 minutes ahead.
One `/api/board` call per city against https://next-train-app.vercel.app, 1.5 s apart,
User-Agent `next-train-controller-horizon-sweep`. Single sample, Sunday — indicative, not proof.
"Furthest-ahead" = minutes from now to the last upcoming departure in a direction.

| City | Station | Directions | Trains/direction (min–median–max) | Furthest-ahead min / median (min) | Response (s) |
|---|---|---|---|---|---|
| brussels | Gare Centrale | 4 | 1–2–2 | 6 / 10 | fast |
| brussels | Arts-Loi | 8 | 1–2–2 | 3 / 10 | fast |
| oslo | Stortinget | 10 | 1–1–2 | 3 / 10 | fast |
| helsinki | Rautatientori | 4 | 5–5–5 | 41 / 46 | 1.5 |
| stockholm | T-Centralen | 12 | 1–3–6 | 4 / 25 | 1.5 |
| goteborg | Göteborg Central | 3 | 0–1–2 | 9 / 38 | 1.6 |
| malmo | Malmö C | 10 | 0–6–12 | 134 / 159 | **22.3** |
| uppsala | Uppsala C | 4 | 0–3–3 | 69 / 122 | 6.0 |
| uk-london-tfl | King's Cross St. Pancras | 13 | 1–3–9 | 5 / 15 | 1.0 |
| greater-manchester | Manchester Piccadilly | 14 | 1–2–4 | 3 / 86 | 0.8 |
| uk-west-midlands | Birmingham New Street | 13 | 0–1–2 | 8 / 23 | 0.9 |
| glasgow | Glasgow Central | 13 | 2–4–8 | 65 / 101 | 2.1 |
| brisbane | Central | 12 | 0–2–8 | 7 / 52 | **12.1** |
| adelaide | Adelaide Railway Station | 7 | 3–5–12 | 106 / 144 | **22.5** |
| canberra | Alinga Street | 1 | 6 | 83 | 0.4 |
| gold-coast | Southport | 2 | 9–11–11 | 123 / 162 | 2.0 |
| newcastle | Newcastle Interchange | 1 | 3 | 98 | 1.7 |
| sydney | Central | — | — | — | **no response in 45 s** |
| boston | South Station | — | — | — | **no response in 60 s** (Harvard 30 s) |

Not measured (controller used a station name the API rejected, HTTP 400): Perth, West Yorkshire/Leeds.

## Two problem classes

1. **Short horizon at busy hubs** — a fixed number of departures requested per stop, then split
   across many lines/directions: Oslo (Entur `numberOfDepartures: 15`), Brussels (STIB Waiting
   Times returns two passages per line per stop), and by the numbers Darwin regions at big
   stations (Birmingham New Street, Manchester Piccadilly), Stockholm T-Centralen, Göteborg.
   London TfL's feed is inherently ~30 minutes.
2. **Slow `/api/board` at static-join hubs** — Sydney Central (timeout), Adelaide, Malmö,
   Brisbane, Boston. `api/board.js` fans out one `getMultiCityNextTrain()` per direction via
   `Promise.all`; each dogfood module re-runs the full station fetch/compute per direction.

Briefs: `docs/jim-brief-oslo-board-horizon.md`, `docs/jim-brief-brussels-horizon-and-sncb-directions.md`,
`docs/jim-brief-boston-subway-live-predictions.md`. Board-performance and Darwin-horizon briefs to follow.
