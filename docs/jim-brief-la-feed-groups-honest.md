# Jim brief — Los Angeles: no silent drop of Metrolink/Surfliner groups; route-scoped staleness for Surfliner

**Lane:** bug-fix / product mode. **City:** los-angeles, country united-states. Acquire the lane lock:
the controller checked on 27 Oct 2026 and it was free. **Date:** 27 Oct 2026. **tim-review:** no. Use the
existing approved empty-state copy only.
**Input:** Mark's PASS note on #539, items 2 and 3
(https://github.com/tdrevans-aus/next-train-app/pull/539#issuecomment-6445680985). **These are LA flip
prerequisites.** The controller decided to fix them before #534 flips, under Tim's honest-empty-state rule:
a group that's missing must say why, never vanish silently.

## 1. Silent catches in composeStationBoard

`lib/providers/los-angeles.js` has empty `catch {}` blocks around the Metrolink and Surfliner group
composition (around lines 1075–1169; there are six bare catches, so review each one). A stale or failed
group currently yields no rows, no log, no partial flag and no per-group `emptyReason`. That's exactly how
the #539 Surfliner bug stayed hidden.

**Fix:**
- In each catch that guards a **feed group**: log with `console.error`, naming the group and error class,
  and never the key, URL query or headers.
- Set `metrolinkPartial` / `surflinerPartial`, or the existing partial-board mechanism. Follow #502's
  "typed FeedUnavailableError + honest partial boards" pattern.
- Make the group's chips carry an `emptyReason`. For a feed failure that's `no-live-predictions`, or
  whatever the established partial-board reason is. Check #502 and the Dublin/Prague precedent and match it.
- Metro Rail rows must still render when a secondary group fails.
- Catches that aren't feed-group guards (e.g. optional static lookups): leave them, but justify each one
  briefly in a comment.

## 2. Route-scoped staleness check for the Surfliner

#539 passes `skipResolvedShareCheck: true` in `composeSurflineTripRows`, because transitdocs is nationwide
and only ~10% of its trips resolve. That leaves only the calendar check, which is weak because Amtrak
calendars run long.

**Fix:** replace the blanket skip with a resolved-share check over **route-78 entities only**. The
adapter already filters on `routeId`, and the live feed has about 27 of them. If fewer than about 50%
of route-78 trip ids resolve against the static snapshot, treat the Surfliner static as stale. That means
a typed error caught by item 1, so the group is flagged and logged rather than silently showing nothing.
Don't loosen the shared builder's default for any other city.

## QA

- Gate cases in `qa/los-angeles-dogfood-gate.mjs`, offline:
  - a throwing Metrolink composer gives Metro rows intact, the Metrolink chips with an `emptyReason`, the
    partial flag set and a log line;
  - the same for the Surfliner;
  - a route-78 resolved share under the threshold flags the Surfliner group as stale;
  - the real fixture from #539 (train 562) still gives its one live row.
- Mutation-check each case: restore the bare `catch {}`, and restore `skipResolvedShareCheck: true`.
- `node qa/run-all.mjs --smoke` passes (plain, with a 600000 ms timeout, in the foreground). Read the full
  summary.
- Live probe if it's LA service hours: Union Station shows Metro, Metrolink and Surfliner rows. Keys are in
  the main checkout's `.env.local`. Never print them. Swiftly must stay under 180 requests per 15 min.

LA stays `planned` on master. Open a PR that links this brief and Mark's note, and leave no background
loops running.
