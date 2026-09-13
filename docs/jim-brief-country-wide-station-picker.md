# Jim brief — country-wide station picker (Country stays, City becomes an optional filter)

**Lane:** bug-fix / product mode. `tim-review: yes` — this changes the picker's information
architecture and copy. Tim chose the design in chat on 13 Sep 2026 ("I like the middle path. Do
that.").
**Lane lock:** none (shared `public/` UI; no `lib/providers/` changes). Leave no background
sleep/poll loops running when you finish.

## Why

Riders must currently pick Country, then City (a region), then a station from that region only.
Once the UK station fill lands (`docs/jim-brief-uk-station-fill-phase1.md`, phase 2 to follow)
the UK will have about 2,600 National Rail stations across 19 regions, plus an eventual
"Rest of England" region. Nobody knows which of our regions owns Grantham or Hastings. Tim's
lens: "think of it as a user trying to find their station" — they should never have to guess a
region. Station names collide across countries (Perth, Newcastle, Richmond), so Country stays.

## The design (decided — do not re-open)

1. **Region screen.** Country dropdown stays. The City dropdown stays on screen but becomes an
   optional *filter* over the station list, defaulting to a new first entry **"All"**, and its
   label changes from "City" to **"Region (optional)"**. Screen title stays "Region". Choosing
   a region still works exactly as today (list narrows to that region), so the QA scripts that
   drive the picker by region keep passing with at most a default-value change.
2. **Station box searches the whole country.** With the filter on "All", the "Choose station"
   combobox (`public/station-combobox.js`) lists every station of every *live* region in the
   selected country. The existing "Type a station" search field becomes the primary interaction:
   opening the box focuses it (keyboard up on mobile). Matching stays prefix/word-start as
   today; when it isn't, say so in the PR.
3. **Before typing, show the likely picks first.** Two short groups at the top of the list:
   *Your routes* (stations from saved routes, de-duplicated, most recent first) and *Near you*
   (nearest 5 stations when a location fix is already cached; do **not** trigger a new location
   prompt from the picker). Omit a group when it's empty.
4. **The full list is grouped by region** beneath those, with sticky collapsible headers named
   by the region's `displayName` in the registry, regions in alphabetical order, stations
   alphabetical within a region. Headers are hidden while a search query is active (flat results,
   each row tagged).
5. **Rows carry a region tag** — small muted text after the name, e.g. "Newport · South Wales",
   "Haymarket · Edinburgh" — plus the existing mode icon where a name exists in two modes. When
   the region filter is set to one region the tag is omitted (redundant).
6. **Picking a station sets the active region silently.** Every station belongs to exactly one
   region; on selection, store that region as the active city (`readActiveCity` /
   `readPreferenceCity` and whatever writes them) so everything downstream — saved routes,
   direction lists, coverage notes on the Help screen, journey persistence, `city-directions`
   lookups — sees exactly what it sees today. Do not change any of those consumers.
7. **Near me is untouched.**
8. **Coming-soon regions stay visible (Tim, 13 Sep 2026: "What about Melbourne?").** The
   Region filter dropdown keeps its existing "<Region> (Coming Soon)" entries, behaving as today.
   In the "All" list, planned regions appear as non-selectable headers at the bottom of the
   grouped list, e.g. "Melbourne (Coming Soon)", with no rows beneath. When a search returns no
   live station, the empty state reads "No match. Coming soon in this country: Melbourne" (list
   the planned regions of the selected country; omit the sentence when there are none). Do not
   include planned regions' catalogs in `country-stations`.

## Data

- The app fetches one region's list per `GET /api/city-stations?city=<id>`. For "All" it needs
  every live region of the country. Add a server endpoint `GET /api/country-stations?country=<id>`
  that concatenates the live regions' catalogs for that country with a `region` field per row
  (id + displayName), cached with the same headers as `city-stations`. Country id comes from the
  registry's country field for each city — check how the Region screen currently populates the
  Country dropdown and reuse that mapping. Do not download anything from Vercel Blob for this.
- Cache the country list in memory and `localStorage` (keyed by country + a version/ETag) so the
  picker opens instantly on the second visit. Wrap storage access in try/catch.
- Perth is the original single-city integration and does not answer `city-stations` — make sure
  it appears in the Australia list by whatever path its stations are served today.

## Acceptance criteria

1. Region screen: Country select unchanged; the second select is labelled "Region (optional)"
   with "All" first and selected by default for new installs. Existing installs with a stored
   region keep it selected (no surprise change on upgrade).
2. With "All" selected for the UK, typing "gran" shows Grantham (once phase 1 or 2 has added it;
   until then use a station that exists, e.g. "edin" shows Edinburgh Waverley tagged Edinburgh and
   Edinburgh Park if present). Typing "perth" under Australia shows Perth (Australia) only.
3. Selecting a station from the "All" list sets the active region to that station's region;
   the Help screen's coverage notes then show that region.
4. The pre-typing list shows *Your routes* and *Near you* groups when non-empty, then sticky
   collapsible region headers.
5. `GET /api/country-stations?country=<uk id>` returns every live UK region's stations with a
   `region` field, and returns 400 for an unknown country.
6. New QA script `qa/country-wide-picker.mjs` (browser-driven like `qa/smoke-browser.mjs`):
   opens the picker, asserts the "All" default, types a query, asserts a tagged result, selects
   it, asserts the active region changed. Registered in the smoke tier of `qa/run-all.mjs`.
   Give it the same one-retry treatment as the other browser scripts if it proves flaky.
7. `node qa/run-all.mjs --smoke` passes. Existing picker-driven scripts pass, adjusted only for
   the new default value where they assumed a region was pre-selected.
8. Help dialog: update the "Region" entry's copy in `public/index.html` to describe the new flow
   in one or two sentences; put the exact copy in the PR description for Tim.

## Process

Worktree; copy this brief in; commit, push; PR titled "Picker: country-wide station search,
region becomes an optional filter" linking this brief and marked **tim-review** with the copy
strings and two screenshots (list before typing, list mid-query) captured with the existing
headless screenshot script if it's convenient.
