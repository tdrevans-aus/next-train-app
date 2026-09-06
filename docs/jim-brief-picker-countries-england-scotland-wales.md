# Jim brief — split the "United Kingdom" picker country into England, Scotland and Wales

**Date:** 7 Sep 2026 · **Lane:** bug-fix/product lane (CLAUDE.md "Bug-fix lane") · **tim-review:** no — Tim asked for exactly this on 6 Sep 2026; merge when Mark is green and `web-qa` is green.
**Dispatch:** `subagent_type: jim`, `isolation: "worktree"`. Branch name `picker-countries-eng-sct-wls`. Commit, push, open a PR that links this brief.

## Why
The UK list in the region picker is 20 rows and growing. A rider in Glasgow does not think of "United Kingdom → Glasgow"; a rider in Cardiff wants Wales. Tim's decision (6 Sep 2026): split the **picker** into three countries. This is a picker/IA change only — the pipeline, the country ledger (`docs/united-kingdom-ledger.md`), the shared Darwin provider, the `gb` lane-lock key, and every region id stay as they are. Region ids are never renamed.

## What to change

### 1. `public/city-session.js` — `COUNTRIES`
Replace the single `{ id: "gb", name: "United Kingdom" }` entry with three, in this order in the array (the country select is alphabetical by name; the array order is what the picker shows, so keep the array alphabetical too):

| Country id | Name | Regions (existing ids, alphabetical by their display name) |
|---|---|---|
| `gb-eng` | England | cumbria, greater-anglia (East Anglia), east-midlands, liverpool-city-region, uk-london-tfl (London), london-se-national-rail, greater-manchester (Manchester), north-east, solent, southwest (South West (Devon / Cornwall)), south-yorkshire, thames-valley, uk-west-midlands, west-of-england, west-yorkshire |
| `gb-sct` | Scotland | rest-of-scotland → display name becomes **"Aberdeen / Inverness / Dundee"** (inside a Scotland list the "Scotland (…)" prefix is redundant), edinburgh, glasgow |
| `gb-wls` | Wales | rest-of-wales → display name becomes **"North, Mid & West Wales"**, south-wales |

Keep every region's `timeZone`, `comingSoon`, and `feed` fields exactly as they are. Place the three countries where "United Kingdom" sat relative to the other countries, so the overall order is Australia, Canada, England, Finland, Netherlands, New Zealand, Norway, Scotland, Sweden, Wales — i.e. sort the whole `COUNTRIES` array by name (today it isn't sorted; the country select may already sort, check `fillCountrySelect`).

Cross-border regions stay with the country holding most of their stations: Cumbria and North East are England; Rest of Wales (which includes Chester/Shrewsbury as pass-throughs but not as catalog stations) is Wales.

### 2. Migration of saved `savedCountry: "gb"`
`readSavedCountry()` currently returns the stored id only if `countryById(id)?.id === id`. A rider with `savedCountry: "gb"` and `savedCity: "glasgow"` must land on Scotland → Glasgow with no prompt and no data loss. Implement: if the stored country has no entry, derive it from `regionById(savedCity)?.country.id`; if that also fails, fall back as today. `persistRegion` already writes the derived country, so one launch migrates the store.

### 3. `public/journey-model.js` — `PERSISTED_COUNTRY_IDS`
Add `"gb-eng"`, `"gb-sct"`, `"gb-wls"`. **Keep `"gb"`** so an older stored value survives the sanitizer until step 2 rewrites it (removing it would drop `savedCountry` and force the picker back to Australia on upgrade).

### 4. Registry `displayName`s and gates
`lib/providers/registry.js` `displayName` for `rest-of-scotland` and `rest-of-wales` follow the new strings; update `qa/rest-of-scotland-dogfood-gate.mjs` and `qa/rest-of-wales-dogfood-gate.mjs` assertions (they assert the exact string, including the "must remain Perth Australia" line in the Scotland gate). `qa/live-city-lists-sync.mjs` parses `COUNTRIES` with a regex (line ~80) and checks every live city's country id is in `PERSISTED_COUNTRY_IDS` — it must stay green. `qa/region-selection.mjs` line ~152 special-cases `country === "gb"` for London; update to `gb-eng`.

### 5. Anything keyed on country `gb` elsewhere
`grep -rn '"gb"' public qa lib android/app/src/main/java` before you start. The lane lock (`qa/lane-lock.mjs`) and the ledger use `gb`/`united-kingdom` as the *pipeline* country — leave those alone. Feed attribution (`isDarwinCityId`, `feedAttributionForCity`) is keyed on region ids/`feed`, unchanged.

## Acceptance
1. Region screen shows England, Scotland, Wales as separate countries with the region lists above; no "United Kingdom" entry remains in the picker.
2. A store with `{ savedCountry: "gb", savedCity: "glasgow", regionExplicit: true }` opens on Scotland → Glasgow, label "Glasgow", no mismatch prompt. Add this case to `qa/region-selection.mjs` (or a new `qa/picker-country-migration.mjs` registered in the smoke tier of `qa/run-all.mjs`).
3. First load with GPS in Cardiff (51.4760, -3.1790) follows to Wales → South Wales (PR #318 behaviour) — add as a case in the same script.
4. `node qa/live-city-lists-sync.mjs`, `node qa/region-selection.mjs`, the two renamed gates, and `node qa/run-all.mjs --smoke` all green.
5. No change to any region id, `CITY_BOUNDS`, provider, or API shape.

## Out of scope
Northern Ireland (Translink — not scoped), any station catalog change, the Help/coverage notes (separate brief `docs/jim-brief-help-coverage-notes.md`).
