# Wellington Metlink GTFS fixture (TRAIN)

**Not committed to git** (dropped 2026-08-30 — see docs/jim-brief-gtfs-data-platform-scale.md).
The adapter always fetches the live static URL directly (no directory fallback), so this
fixture is regeneration/reference-only — nothing at runtime reads it.

**Source:** https://static.opendata.metlink.org.nz/v1/gtfs/full.zip
**Trimmed:** 2026-08-27

KPL, HVL, MEL, JVL, WRL only. No bus/ferry/cable car.

Do **not** generate `qa/fixtures/wellington/published-network.json` from this feed. Wait for Luke D1.
