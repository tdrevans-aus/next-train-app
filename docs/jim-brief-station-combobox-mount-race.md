# Jim brief: multi-city station picker race — switching regions can show the wrong city's stations

**For:** Jim (implement)
**From:** Tim (via top-level session)
**Date:** 2 Sep 2026
**Status:** Ready to fix — confirmed independently by Tim in a real browser (Liverpool City Region selected, Sweden's station list rendered) and reproduced by the top-level session testing Stockholm's own picker showing Perth's list.
**Related:** `public/station-combobox.js` (`getStationsList`), `public/brisbane-dogfood.js` (`mount`, `state`)
**Out of scope:** Any UK-region-specific code, registry.js, or the three UK flip PRs (#191/#193/#194) — this bug is in shared multi-city plumbing used by every live city and predates all of them.

---

## 1. What's happening

Switching the app's region (Menu → Region → pick a new country/city) can leave the station search box showing a **different city's stations than the one just selected** — not empty, not an error, silently wrong data. Confirmed twice independently: Liverpool City Region selected → Sweden stations shown; Stockholm selected fresh → Perth's default stations shown.

## 2. Root cause

`public/station-combobox.js`, `getStationsList()`:

```js
async function getStationsList() {
  const city = planningCityId();
  const dogfoodApi = window.NextTrainBrisbaneDogfood;

  if (isMultiCityCatalog(city)) {
    if (dogfoodApi && dogfoodApi.getCity?.() !== city) {
      await dogfoodApi.mount?.(city);
    }
    const dogfood = dogfoodApi?.getStations?.() ?? [];
    stationsCache = dogfood;
    return stationsCache;
  }
  ...
```

`public/brisbane-dogfood.js`, `mount(city)`:

```js
async function mount(city) {
  const id = String(city || "").toLowerCase();
  ...
  let catalog = state[`${id}Catalog`];
  if (!catalog?.stations?.length) {
    catalog = await loadCatalog(id);
    state[`${id}Catalog`] = catalog;
  }
  ...
  const directionMap = await loadDirectionsMap(id);
  state.city = id;
  state.stations = catalog.stations;
  state.coords = catalog.coords;
  state.directionsByStation = { ...directionMap, ...(catalog.directionsByStation ?? {}) };
  state.active = true;
  ...
}
```

`mount()` writes directly into shared module-level `state` with **no guard against overlapping calls**. If a user (or the app itself, via some re-render/effect) triggers `mount(cityA)` and then, before that resolves, `mount(cityB)`, both are in flight against the same `await loadCatalog(id)` / `await loadDirectionsMap(id)` network round-trips. Whichever `mount()` call's promises resolve **last** wins the write to `state.city`/`state.stations` — regardless of which one was called last. A slower catalog fetch for an earlier-selected city can finish after a faster fetch for the city the user actually picked, silently clobbering the correct state.

This is a classic out-of-order-async race, not a UK-region-specific bug. It can happen any time a user switches regions quickly, or when app code calls `mount()` more than once in close succession (region change handler, a stale re-render, a retry, etc.) — worth checking call sites of `mount(` across `public/` for exactly this pattern of "call again before the first resolves" while you're in there, but don't go looking for a redesign; the fix belongs in `mount()` itself so every caller is protected, not in each caller.

## 3. Fix

Give `mount()` a monotonic request token so a stale resolution can detect it's stale and discard itself instead of overwriting newer state:

```js
let mountToken = 0;

async function mount(city) {
  const id = String(city || "").toLowerCase();
  const myToken = ++mountToken;
  ...
  // after every await, before writing to `state`:
  if (myToken !== mountToken) {
    return false; // a newer mount() call has started; don't clobber its result
  }
  ...
  state.city = id;
  state.stations = catalog.stations;
  ...
}
```

Apply the staleness check after *each* `await` in `mount()` that precedes a `state` write (there are two: the catalog load and the direction-map load), not just once at the end — a stale call could still be the one to finish the catalog load first and start writing before a newer call's own awaits resolve. The exact shape of the guard (early-return vs. wrapping the whole tail in one check) is your call; the important property is: **the state a caller reads after `mount()` resolves must correspond to the last city `mount()` was actually called with, never an earlier one.**

Also check whether `getStationsList()`'s own `if (dogfoodApi.getCity?.() !== city) { await dogfoodApi.mount?.(city); }` guard needs anything analogous — if two `getStationsList()` calls for two different cities run concurrently, make sure the one that resolves last returns *its own* city's stations, not whatever `state.stations` happens to hold at that moment (reading `dogfoodApi.getStations()` right after your own `mount()` awaits should be safe once `mount()` itself is race-proof, but double check `getStationsList()` doesn't need its own token too, since it reads `dogfoodApi?.getStations?.()` after the await, which is a read of shared state, not a return value from `mount()` — think through whether a second call's write could land between your await returning and your read of `getStations()`).

## 4. Verify

- Reproduce first: rapidly switch between two multi-city regions (e.g. Stockholm → Liverpool City Region → Stockholm) and confirm you can currently get the wrong city's station list before your fix, so you know the fix actually addresses it.
- After the fix, repeat the same rapid-switch test and confirm the station list always matches the last-selected city, including under repeated rapid switching (not just once).
- Add a regression test if a reasonable one exists in this codebase's style (check `qa/` for how other race/timing bugs here have been tested — e.g. two overlapping `mount()` calls with controllable/delayed promise resolution order, asserting the later call's city wins regardless of resolution order).
- Confirm `node qa/run-all.mjs --smoke` stays green.
- This is shared code used by every live multi-city (Sydney, Brisbane, Adelaide, Amsterdam, Rotterdam, Vancouver, the Swedish cities, Oslo, Helsinki, West of England, and whichever of #191/#193/#194 have merged by the time you pick this up) — spot-check at least two of them still resolve correctly after your fix, not just the one you used to reproduce.
