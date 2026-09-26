Dublin D1 + research pack. City stays **planned** until Jim wires testers live. All other cities' live-gates untouched — this pack only writes inside `docs/dublin-d1/`. **assertCityLive("dublin") must still fail** (city is not in `lib/providers/registry.js` CITIES today — Unknown city / 400). No generator, no product edit. Jim owns D2–D6. Do not flip dublin live from this pack. Do not invent city=dub, city=ie, or merge into a national multi-city Irish feed.

Drop later (Jim D2): `qa/fixtures/dublin/published-network.json`. Research pack is `docs/dublin-d1/`: `published-network.json`, `oracle-clash-report.md`, `hazard-pack.md`, `direction-model-memo.md`, `jim-handoff.md` (this file).

D1 = official **Luas Network Map** PNG (DatoCMS asset 225949/1784119177, linked from https://www.luas.ie/luas-map/), hand-transcribed from the rendered image by this pack — the oracle report explicitly deferred station-array transcription to this step. **Not generated from GTFS.** Static NTA GTFS zip verified 200 (no key) by the oracle report — do not use it to build stations[].

Two colour lines, no printed route numbers: **Red** — two southwestern branches forking at **Belgard** (Saggart via Fettercairn/Cheeverstown/Citywest Campus/Fortunestown, 29 stops end-to-end; Tallaght via Cookstown/Hospital, 27 stops end-to-end; 24-stop common trunk east to The Point) — **32 unique stops total**. **Green** — Broombridge to Brides Glen, **35 unique stops**, including a **one-way city-centre loop** between Parnell and Trinity. **67 unique Luas stops total** across both lines.

Hub lock **Abbey Street** (Red trunk, between Jervis and Busáras; confirmed by dot position on the map). Not Connolly (Red only, DART interchange, no Green access). Green interchange (Marlborough / O'Connell - GPO / O'Connell Upper) is a **~200 m walk**, not a shared platform.

**Sharpest hazard in this pack — read before D5:** the Green Line's Parnell↔Trinity loop is direction-exclusive, not a simple branch. `O'Connell - GPO` and `O'Connell Upper` are served **northbound only** (towards Broombridge); `Marlborough` is served **southbound only** (towards Brides Glen). If the product's station/board model assumes every stop has both directions, these three stops will need a design decision, not a default — flagged as an open §3 question for Tim in `direction-model-memo.md`. Full detail and evidence in `hazard-pack.md` H4a and the `cityCentreLoop` object in `published-network.json`.

**Second hazard:** the oracle report's Red Line terminus claim ("Terminates Malahide or Howth") is **factually wrong** — those are DART termini, not Luas. Not carried into this pack's files; flagged in `hazard-pack.md` "What the oracle report didn't have" in case it resurfaces when DART (v2) is picked up.

**Third hazard:** the oracle report's DST claim ("no daylight saving observed since 2024") is unverified and likely wrong — Ireland's clock-change abolition proposal stalled at EU level and was never enacted. Recommend Jim use the IANA identifier `Europe/Dublin` directly (tzdata handles the real rule) rather than any hand-rolled fixed-offset table. See `hazard-pack.md` H7.

C2/C3: (1) Separate city dublin, agency Luas (Keolis/NTA). Do not invent city=dub/ie. (2) Lock Abbey Street. (3) Luas Red+Green only — no DART (v2), no bus (out of mode), no premetro. (4) doNotGroup Abbey Street vs Marlborough/O'Connell-GPO/O'Connell Upper; O'Connell-GPO vs O'Connell Upper; Tallaght vs Saggart; Red Cow vs Kingswood vs Belgard. (5) No printed route numbers — colour-only branding, gtfsRouteIdsIfKnown left empty for Jim to verify against the real NTA feed in D2, do not invent.

**Live boards: NTA GTFS-RT v2 keyed later — not a D1 blocker.** Portal https://developer.nationaltransport.ie/. Header `x-api-key`. This pack made no keyed calls and did not paste a key. D1 stays planned. assertCityLive("dublin") must fail.

§3 rec: colour + terminus (`Red + Tallaght`, `Red + Saggart`, `Green + Broombridge`, `Green + Brides Glen`). Abbey Street is a hub stop string, never a direction token. Hold D5 on the Parnell/Trinity direction-exclusive question above. Jim owns D2–D6. When Jim wires, testers can pick city id **dublin**. Do not flip from this pack — that's Jim/Mark's job once QA is green.

## Publishing the Luas GTFS static snapshot (added, docs/jim-brief-dublin-blob-publish-action.md)

`lib/providers/dublin.js` reads its static Luas-only GTFS from
`gtfsFixtureBlobUrl("dublin")` (the shared next-train-gtfs Vercel Blob store), and that path has
never been published — publishing needs `BLOB_READ_WRITE_TOKEN` (network access to Vercel Blob)
and Claude sandboxes have neither. A one-click GitHub Action now does it instead:
`.github/workflows/publish-gtfs-snapshot.yml`.

**Two GitHub repo secrets Tim must add** (Settings → Secrets and variables → Actions → New
repository secret), copied from the same-named Vercel project env vars:

- `BLOB_READ_WRITE_TOKEN` — required. Without it the workflow fails immediately with a clear
  "secret not set" error rather than a cryptic upload failure.
- `NTA_API_KEY` — not required for this workflow (Dublin's static `GTFS_All.zip` download from
  transportforireland.ie needs no key; only the *realtime* NTA GTFS-RT v2 feed does). Wired into
  the workflow's env anyway in case a future trim step needs it. Safe to add or skip.

**To publish (one click):** GitHub → Actions tab → "Publish GTFS snapshot" workflow → "Run
workflow" → `city: dublin` → Run. It runs `scripts/trim-dublin-gtfs.mjs` (national NTA zip →
Luas-only Red+Green), publishes the trimmed zip via
`scripts/publish-gtfs-fixture-to-blob.mjs dublin`, then runs
`qa/verify-dublin-gtfs-snapshot.mjs` (a standalone check — `qa/gtfs-live-blob-snapshot-integrity.mjs`
only covers `status: "live"` cities, and Dublin stays `planned`) to confirm the published blob is
a real, non-empty snapshot whose `stops.txt` actually contains Luas stops. The workflow is
`workflow_dispatch`-only — it never runs on a schedule or on push, and has no effect until someone
runs it from the Actions tab.

Once published, `gtfsFixtureBlobUrl("dublin")` resolves to real data and Dublin's D2 static-data
dependency is unblocked, ahead of (not instead of) the separate live-flip QA gate.
