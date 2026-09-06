# Jim brief — "What's covered" notes in Help, reachable from the station picker

**Date:** 7 Sep 2026 · **Lane:** product (CLAUDE.md bug-fix lane) · **tim-review: yes** — this is rider-facing copy and a new entry point; open the PR, get Mark's QA, then wait for Tim.
**Dispatch:** `subagent_type: jim`, `isolation: "worktree"`. Branch `help-coverage-notes`. Commit, push, open a PR linking this brief.

## Why (Tim, 6 Sep 2026)
Trust. Riders need to know, region by region, which services the boards include and which they don't (e.g. Nottingham's NET tram has no confirmed feed; Caledonian Sleeper is excluded as reservation-only; the Metrolink list is termini-only). Today that knowledge lives only in oracle reports and registry `notes`. The moment a rider needs it is when they can't find their station in the picker.

## Data — one file per region, hand-curated, gated
Add `lib/cities/<city>/coverage.json` for **every live region** (all 38 in `MULTI_CITY_IDS` plus Perth at `lib/cities/perth/coverage.json`):

```json
{
  "region": "greater-manchester",
  "updated": "2026-09-07",
  "covered": [
    { "label": "National Rail", "detail": "Every train shown on the station's live board (Northern, TPE, Avanti, CrossCountry, EMR, TfW)." }
  ],
  "partial": [
    { "label": "Metrolink", "detail": "Termini and major stops only; no live times until TfGM publishes a real-time feed." }
  ],
  "notCovered": [
    { "label": "Bus", "detail": "Not a rail app." }
  ],
  "stations": "19 stations — Manchester Piccadilly, Victoria, Oxford Road, Stockport and the Metrolink termini.",
  "notes": "Manchester Victoria appears twice: once for trains, once for trams."
}
```

Seed the UK entries from each region's `docs/<city>-d1/oracle-clash-report.md` Board eligibility section and the registry `notes` (`lib/providers/registry.js`), and the national verdicts in `docs/united-kingdom-ledger.md` §3 (Sleeper, Eurostar, Heathrow Express, etc.) and §4 coverage boundaries. Non-UK regions get a minimal honest entry (what mode, which agency feed, real-time or timetable). Write for riders, not for the pipeline: no CRS codes, no "D1 pack", no agent names. Plain sentences, under ~60 words per field.

Gate: `qa/coverage-notes-gate.mjs` (smoke tier) — every live city has a `coverage.json` with the fields above, `updated` is a date, no `TODO` strings, every `partial`/`notCovered` item has a `detail`.

Serve them: `api/coverage-notes.js` returning `{ region, ...json }` for `?city=` (same shape as `api/city-stations.js`), and bundle them into the APK the way `scripts/write-city-directions.mjs` bundles directions (`public/coverage-notes/<city>.json` at `cap:sync` time, gitignored). The app reads the bundled file first, the API second.

## UI

### Help dialog entry (Menu → Help)
New `<details class="help-faq">` **"What's covered in <Region>"** (label follows the active region via `regionDisplayName`) rendering the active region's coverage.json: three short lists (Covered / Partly covered / Not covered), the stations line, notes, and the `updated` date. Below it a plain link "Other regions" that opens the region screen. Keep the existing FAQ entries untouched.

### Entry point from the station picker — proposal for Tim (implement A, stub B behind the same handler)
**A. "Can't find your station?" link under the picker list.** In `public/station-combobox.js`, when the filtered list is empty *or* the list is open, render a final non-selectable row "Can't find your station? See what's covered in <Region>" that opens the Help dialog with the coverage entry expanded (`#help-dialog` + `details[open]`, scrolled into view). This is the moment of need Tim described; it appears in all three pickers (Near me fallback `#nearby-station-combobox`, journey detail `#detail-station-combobox`, and the routes picker) with no new chrome.
**B. A small "?" icon-button** at the right of the "Choose station" label (`.nearby-fallback` label and the journey-detail station label), same handler, `aria-label="What's covered in <Region>"`, 44 px hit target, uses the existing `help-inline-icon` style. Cheap, always visible, but adds chrome — Tim to decide whether to keep it after seeing A.

Also surface it from the out-of-area card (`renderUnsupportedRegionBoard` in `public/nearby-mode.js`): the hint line gets a "See what's covered" link when the region is known.

## Acceptance
1. Coverage gate green; all 39 files present; UK entries read as rider prose (Mark spot-checks five against the oracle reports for factual drift — e.g. NET, Sleeper, Metrolink, Supertram, Merseyrail must match the recorded verdicts).
2. Help dialog shows the active region's entry; switching region in the region screen updates it without reload (listen for `nexttrain:city-changed`).
3. Empty picker search in Manchester shows the "Can't find your station?" row; tapping it opens Help scrolled to "What's covered in Manchester". Add `qa/help-coverage-entry.mjs` (smoke tier, Playwright) covering this in Perth and one UK region.
4. `node qa/run-all.mjs --smoke` green; no change to `/api/next-train` shape.

## Out of scope
Localisation, per-station notes, Android widget. Don't edit oracle reports.
