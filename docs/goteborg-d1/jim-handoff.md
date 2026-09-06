Göteborg D1 + Trafiklab GTFS Regional adapter. City stays **planned**. Picker shows **Göteborg (Coming Soon)** under Sweden (`se`), beside Stockholm. Perth/Sydney/Brisbane/Amsterdam/Rotterdam live-gates untouched. **assertCityLive("goteborg") must still fail.** No generator. Do not invent city=sweden or gothenburg.

Drop later (already copied as D2): qa/fixtures/goteborg/published-network.json. Research pack is docs/goteborg-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md, qa-note.md.

D1 = official Västtrafik **Spårvagns- stombuss- och båttrafik 2026-06-15** plus **Expressbussar och pendeltåg** on https://www.vasttrafik.se/reseplanering/mer-om-reseplanering/linjekartor/. **Hand-transcribed. Not generated from GTFS.**

Modes v1: tram **1–12** + three city-map pendeltåg (**Kungsbacka / Alingsås / Ale**). 132 unique tram + 25 unique train = **157** unique names. No stombuss, båt, express X-bus, regional Västtågen beyond those three. **No metro.** City id is **goteborg**. Display **Göteborg**.

C2/C3: (1) Lock **Brunnsparken** (10 of 12 trams). Lines **8** and **12** miss it — they live at **Korsvägen**. (2) Do not lock **Centralstationen** (renamed **Drottningtorget** 15 Jun 2026). Västtågen hub is **Göteborg Central**. (3) doNotGroup Drottningtorget vs Göteborg Central vs Nils Ericsonsplatsen vs Nils Ericson Terminalen; Liseberg Station tram vs (tåg) vs Liseberg Södra; Gamlestads Torg vs Gamlestaden Station. (4) Line 12 is new Mölndal–Lindholmen. Line 2 is Högsbotorp–Biskopsgården, not Mölndal. (5) Preserve Swedish characters. **Do not merge into Stockholm or Malmö.**

H2: **Trafiklab GTFS Regional `vt`** with `TRAFIKLAB_API_KEY` (static zip). Trafiklab operator table shows **no TripUpdates / vehicle positions for Västtrafik** — adapter uses shared `lib/providers/gtfs/realtime-board.js`, attempts the standard RT URL, and **falls back to schedule-only**. Västtrafik Planera Resa v4 OAuth remains a later option; not wired here. See `qa-note.md` item 11.

H7: **Europe/Stockholm HAS DST.** Do not copy Brisbane no-DST.

§3 rec: **line + terminus** (1 + Tynnered, 12 + Lindholmen, Västtågen + Kungsbacka). Use map legend far end, not first-halt strings. Never “to City”. Do not flip goteborg live.

## Update 6 Sep 2026 — Västtrafik Planera Resa v4 live board

Context has moved on since the paragraphs above (written when Göteborg was still `planned`):
Göteborg was flipped tester-live by Tim on 29 Aug 2026 on the Trafiklab schedule-only board
(H2 above). Per `docs/jim-brief-goteborg-vasttrafik-live.md` (dispatched 6 Sep 2026, Tim's
rule that a city with a usable live feed must use it), the board now uses **Västtrafik
Planera Resa v4** (`lib/providers/vasttrafik.js`) as the primary source, with the Trafiklab
static path (H2) kept only for the catalog/stop-id mapping and as the schedule-only fallback
board. This is a live-board upgrade to an already-live city, not a new city — `registry.js`'s
`status` line is untouched (still `"live"`) and no picker/list membership changed.

### Update 6 Sep 2026 (second pass) — verified live against the real API

A first pass at this brief (WIP commit, session-limited before it could get credentials) wrote
the adapter shape below correctly but had to *infer* the answers to unknowns 1, 3 and 4 rather
than observe them, because it had no credentials. This pass had `VASTTRAFIK_CLIENT_ID`/
`VASTTRAFIK_CLIENT_SECRET` (Tim's registered application) and `TRAFIKLAB_API_KEY`, and used them
to hit the real `/pr/v4/stop-areas/{gid}/departures` endpoint and pull the real `vt.zip` GTFS
static feed. Two of the three inferences turned out wrong in ways that would have silently
dropped real departures from the live board; both are now fixed in `lib/providers/goteborg.js`
and re-verified live. The four unknowns, as actually settled:

1. **Rate limit / quota — still unresolved, recorded as unknown.** Confirmed again this pass: no
   numeric tier shown on developer.vasttrafik.se before or after subscribing, and no rate-limit
   headers (`X-RateLimit-*`, `Retry-After`, etc.) on any `/pr/v4` response observed. Kept the
   conservative **30-second shared cache window per stop area**
   (`VASTTRAFIK_DEPARTURES_CACHE_TTL_MS` in `lib/providers/vasttrafik.js`, mirroring
   `lib/providers/gtfs/ovapi-tripupdates-cache.js`'s cache shape, scaled up for the unknown
   quota) with in-flight coalescing so concurrent board requests for one stop area never fan out
   into multiple upstream calls. **Flag for Tim:** ask Västtrafik support directly for the
   numeric limit before wider rollout.
2. **Licence — still `unclear`, not resolved by this PR.** Out of adapter-lane scope; unchanged
   from the first pass. **Flag for Tim:** confirm the v4 subscription terms cover commercial
   redistribution via our `/api/next-train` before any store-facing (non-tester) launch. Nothing
   signed.
3. **Tram vs pendeltåg coverage — verified live, and the first pass's inference was wrong in an
   important way.** Confirmed `transportMode: "train"` (not `"vas"` as the first pass
   hedged) for pendeltåg and `transportMode: "tram"` for trams, both correctly routed through the
   `ALLOWED_LINE_CODES` allow-list. But the first pass's corridor detection — matching
   "Kungsbacka"/"Alingsås"/"Ale" as a substring of `serviceJourney.direction` or
   `serviceJourney.line.name` — silently dropped real corridor trains, confirmed against the live
   feed:
   - `serviceJourney.direction` is the train's **actual terminus**, not the corridor name — e.g.
     a departure *at* Kungsbacka heading into town reads `direction: "Göteborg"`, and one at Lerum
     (Alingsås corridor) can read `direction: "Floda"` (an intermediate stop). Only an
     outbound-from-Göteborg departure's direction happens to say the corridor name. Confirmed by
     pulling live departures for Brunnsparken, Kungsbacka, Korsvägen, Lerum, Nödinge and Alingsås
     stop areas.
   - `serviceJourney.line.name` is generically `"Västtågen"` for all three corridors (and for
     Öresundståg/SJ Regional too) — it never names the corridor. Confirmed by pulling the live
     `vt.zip` and checking `routes.txt`: `route_long_name` for every Västtågen `route_id` is
     `"Västtågen"`, never a corridor name (`trip_headsign` in `trips.txt` is also empty for these
     trips, so the pre-existing Trafiklab-only path had the same latent gap for inbound
     departures — this is not something this PR introduced, but it was never observed until now
     because Göteborg's board is tram-heavy and the pendeltåg gap went unnoticed).
   - **Fix applied:** `goteborgLineCode` in `lib/providers/goteborg.js` now also resolves the
     corridor from **which catalog station the board was requested for**, via a new
     `getStationCorridorMap()` built from `line-map.json`'s three `vasttagen-*` line entries
     (Luke's D1 data — already lists which stations belong to which corridor; no new data
     invented here). A departure at Lerum, Nödinge, Kungsbacka, etc. now resolves to its corridor
     regardless of which way it's headed. Shared-trunk hub stations (Göteborg Central, Gamlestaden
     Station, which sit on more than one corridor) are deliberately left out of the map and still
     rely on the direction-text match, which works there because an outbound departure's
     direction does name the corridor.
   - **Second bug found and fixed in the same pass:** the corridor fallback, if applied to every
     mode indiscriminately, wrongly tagged **buses** passing through a corridor station (e.g. bus
     402 through Nödinge toward Alafors) with that station's corridor code, since Västtrafik's
     `/departures` response is multi-modal and unfiltered per stop area. Fixed by gating the
     corridor fallback (both the text match and the station-map lookup) on `transportMode ===
     "train"`; verified live that buses are excluded again at Nödinge/Kungsbacka/Alingsås/Lerum
     after the fix.
   - **Also found and fixed:** the original substring regex (`new RegExp(corridor, "i")`) matched
     "Ale" inside unrelated words — a Kungsbacka-corridor train's destination "Göteborg, Nils
     Ericson **Ter*min*alen**" was misidentified as the Ale corridor. Changed to a word-boundary
     regex (`\bAle\b`, etc.).
   - **Known remaining limitation, not fixed here — flagged for Luke/Mark:** the station-corridor
     map cannot distinguish an in-scope corridor train from a Västtågen service that shares the
     same physical track past the in-scope terminus (e.g. a Kungsbacka-line train continuing to
     Varberg/Malmö, or an Ale-line train continuing past Älvängen to Vänersborg, or an
     Alingsås-corridor train continuing to Stockholm) — all such departures are currently
     included, tagged with the local corridor's code, at the corridor's own stations. This
     matches the "line + terminus" chip convention's spirit (rider boarding at Kungsbacka going
     toward Göteborg genuinely wants a Kungsbacka-corridor departure) but means the destination
     chip can show a further-out terminus name (`Västtågen + Malmö`, `Västtågen + Vänersborg`,
     `Västtågen + Stockholm`) that isn't one of `MARKETING_ENDS`' two locked termini. Confirmed
     live at Kungsbacka, Nödinge and Alingsås stations. This needs a genuine
     trip/route-pattern-level distinction (which stop is really the far end of *this* service) to
     fix properly — a data question for Luke's line-map, not something to guess at in the adapter
     lane.
4. **Disruption behaviour — handled by design, unchanged from the first pass.** Per the brief's
   warning that departures can vanish from the feed during a disruption instead of being marked
   `isCancelled`, `fetchStationBoard` treats an **empty** (not merely low) live-results array the
   same as a live-fetch failure: falls back to the Trafiklab timetable board for that request
   (`realtime: "timetable"`) rather than returning a blank board. A non-empty live result is
   trusted and returned as `realtime: "live"` even if some rows are individually cancelled
   (`isCancelled: true` passed through, not filtered out). Not independently re-verified against
   a real disruption this pass (none was in progress) — the empty-array fallback logic itself was
   read-verified, not exercised end-to-end against a genuine outage.

**Verification.** With real credentials, `node qa/goteborg-dogfood-gate.mjs` now exercises the
true live path end-to-end (not just the missing-credentials error path): `fetchStationBoard`
returns `realtime: "live"` with populated `liveDeparture` times for Brunnsparken. Ad hoc scripts
against `lib/providers/vasttrafik.js` and `lib/providers/goteborg.js` (not committed — throwaway,
run from the scratchpad) additionally pulled live departures for Brunnsparken, Korsvägen,
Kungsbacka, Lerum, Nödinge and Alingsås stop areas and the real `vt.zip` GTFS static feed to
confirm the corridor-detection findings above. `node qa/run-all.mjs --smoke` run after the fix.

## Update 6 Sep 2026 (third pass) — Västtågen destination-label normalisation

Per `docs/jim-brief-goteborg-vasttagen-destination-labels.md` (production sweep after this
handoff's Planera Resa v4 rollout went live): every pendeltåg station returned an empty board
for every chip it offers, because the live path's `destination` came straight from
`serviceJourney.direction` (`"Göteborg"`, `"Floda"`, `"Stockholm"`) while the chips are
marketing-ends labels (`"Västtågen + Göteborg Central"`, `"Västtågen + Alingsås"`) —
`pickUpcomingProviderTrips` never matched anything. The Trafiklab timetable fallback had the
same latent bug (same unmapped `trip.destination` text), just less visible since the live path
usually answers first.

**Mapping rule implemented in `mapGoteborgDestination` (`lib/cities/goteborg/marketing-directions.js`),
now given the corridor code and the queried station name as well as the raw destination:**

1. A Göteborg-name-family destination (`Göteborg`, `Göteborg C`, `Göteborg Central`, `Göteborg
   Centralstation`) → the hub chip (`Göteborg Central`).
2. A destination that is itself one of the corridor's own stations (`line-map.json`'s per-corridor
   `stations` list, already ordered Göteborg Central → ... → terminus) — compare its position to
   the queried station's position on that same list:
   - ahead of (or at) the requested station → the corridor's outer terminus chip (train still
     outbound: `Floda` seen from Lerum on the Alingsås corridor → `Alingsås`);
   - behind the requested station (closer to Göteborg) → the hub chip (train already passed it,
     now inbound) — this is the "must not relabel a train that's already passed" case the brief
     called out; it's dead in the two D1 stations checked live (no such row observed) but is real,
     symmetric corridor-order logic, not a special case.
   - the destination *is* the corridor terminus itself → the terminus chip, unchanged.
3. Anything not on the corridor's own station list (through-running past the terminus — confirmed
   live: `Stockholm` at Alingsås, and also `Töreboda` at Alingsås, not anticipated by the brief's
   named examples but caught by treating *any* unrecognised place this way rather than a
   hard-coded list of three names) → the corridor's outer terminus chip, the same "still heading
   out" default the un-normalised feed text implied. No corridor position exists to compare
   against the requested station, so there's no inbound branch for this case in practice.
4. **New:** if the computed chip's place name folds equal to the *queried station's own name*
   (only possible via rule 3, seen live at Alingsås and Kungsbacka — a through-running train
   continuing past the very terminus you're standing at), there is no chip that station offers
   matching a trip "toward itself". `mapGoteborgDestination` returns `null` for this case and the
   adapter drops the trip from the board rather than emit an unmatchable label — mirrors
   `marketingLabelsForStation` already excluding a station's own terminus from its own chip list.
   This is what actually closes the "through-running trains" open item from the second-pass update
   above, as far as *destination labels* go — the trip is now either correctly labelled or
   correctly absent, never mislabelled. The underlying data question flagged there (a genuine
   trip/route-pattern-level distinction between an in-scope corridor service and one that shares
   track further out) is unchanged and still open for Luke/Mark; this fix only stops the symptom
   (wrong/unmatched label) from reaching the board.

The original feed text is preserved as an additive `rawDestination` field on the trip (both the
live and timetable-fallback paths) so nothing is lost even though the rider-facing `destination`
is now always a marketing chip.

**Verified live 6 Sep 2026** against Lerum, Alingsås and Kungsbacka stop areas with real
`VASTTRAFIK_CLIENT_ID`/`SECRET`: every trip on Lerum's and Alingsås's live boards now maps to a
chip those stations actually offer (`Västtågen + Göteborg Central`, and `Västtågen + Alingsås` at
Lerum), and `getMultiCityNextTrain("goteborg", { station: "Lerum Station", destination:
"Västtågen + Göteborg Central", ... })` returns a non-null `next`. `qa/goteborg-dogfood-gate.mjs`
now asserts both the live conformance (creds present) and an offline fixture
(`qa/fixtures/goteborg/vasttagen-destinations.json`) covering `Göteborg`/`Floda`/`Stockholm`/
`Varberg` cases including the terminus self-reference drop.

**Rule added 6/7 Sep 2026 (docs/jim-brief-goteborg-bus-rows-on-tram-codes.md):** a Västtrafik live
row only counts as tram line N or Västtågen if the row's own `transportMode` agrees
(`"tram"`/`"train"`) — a designation match against the allow-list is not enough, because
Kungsbacka's town buses reuse designations ("1", "2", "3", "4") that collide with Göteborg tram
numbers. `mapVasttrafikDeparture` no longer falls back to the raw `line.designation`/`.name` when
`goteborgLineCode` rejects a row, and every admitted trip now carries a normalised
`transportMode: "tram"|"train"` field the board can assert on.
