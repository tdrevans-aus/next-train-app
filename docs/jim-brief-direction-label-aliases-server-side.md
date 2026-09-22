# Jim brief — old direction labels must keep working server-side; extend terminus-only labels to Boston CR + Manchester Metrolink

Mode: **bug-fix / product mode**. `tim-review: no` for Part 1 (restores routes that broke); Part 2
follows the label rule Tim already approved (22 Sep 2026: "Yes" to extending it). Written 22 Sep
2026 by the controller session. Copy this file into your worktree and include it in your PR.

## Part 1 — regression: every installed client with a saved Melbourne/Adelaide route now sees "No upcoming trains"

PR #439 renamed Melbourne and Adelaide direction labels and migrated saved journeys with a
`LEGACY_DIRECTION_ALIASES` map in `public/journey-model.js`. That only helps clients running the
new JavaScript. Every installed app (3.0.3 on the Play Store, and any web client with a cached
bundle) still sends the OLD label, and the server rejects it. Confirmed in production 22 Sep 2026:

- `/api/next-train?city=melbourne&station=Eaglemont&direction=Hurstbridge Line + Flinders Street`
  → `next: null` ("No upcoming trains" in the app)
- `…&direction=Flinders Street (Hurstbridge Line)` → 17:06 (works)

Seen on the emulator as "Eaglemont, towards Hurstbridge Line + Flinders Street — No upcoming trains".

**Fix:** accept legacy labels **server-side** in `api/next-train.js` / `api/board.js` / the
direction-matching helpers (`lib/cities/live-city-api.js` and wherever `destinationMatchesFilter`
or the equivalent resolves a requested direction to trips), for Melbourne and Adelaide: map
`"<X> Line + <terminus>"`, `"<X> line <terminus>"` and the loop variants to the new canonical
label before matching, and return the canonical label in the response's `config.destination`
/ `destinationLabel` so the client self-heals its saved value on next write. Keep the client-side
alias map too. Make the mapping one shared table (server and client import the same data — a
small JSON in `lib/cities/<city>/` — rather than two hand-kept copies). Gate: extend
`qa/melbourne-dogfood-gate.mjs` and `qa/adelaide-dogfood-gate.mjs` with a request using each old
label form asserting a non-null next train and the canonical label echoed back.

Rule for the future (write it into `docs/multi-city-provider-design.md` or wherever direction
labels are specified): **a direction label is an API contract; renaming one requires a
server-side alias for the old form, kept for at least one app release cycle.**

## Part 2 — extend terminus-only labels (Perth style) to Boston Commuter Rail and Manchester Metrolink

Same rule as `docs/jim-brief-melbourne-direction-labels-perth-style.md` (on master): where the
line name repeats the terminus, drop the line name; keep it only where the terminus alone is
ambiguous (hub-bound). Boston Commuter Rail: "Greenbush Line + Greenbush" → "Greenbush",
"Lowell Line + Lowell" → "Lowell", "Fall River/New Bedford Line + Fall River or New Bedford" →
"Fall River or New Bedford"; hub-bound rows to South Station / North Station keep the line name
in the same `(… Line)` form. Boston subway colour lines unchanged. Manchester Metrolink:
"Metrolink Eccles Line + Eccles" → "Eccles", "Metrolink Airport Line + Manchester Airport" →
"Manchester Airport". **Because of Part 1, every rename here ships with server-side + client-side
aliases for the old label from day one.** Regenerate the affected `public/city-directions/*.json`,
update the Boston and Greater Manchester gates, and include Mark's amber from #439: Melbourne
"Flinders Street via Altona Loop" headsigns must get the `(Werribee Line)`/`(Williamstown Line)`
hub disambiguation like "via City Loop" does (`stripLoopTunnelSuffix()` only knows City Loop /
Metro Tunnel today).

## Acceptance
- Old-label requests for Melbourne, Adelaide, Boston CR and Manchester Metrolink return trains
  and echo the canonical label (gate-proved per city, plus a live check on Eaglemont).
- New labels for Boston CR and Metrolink as above; no label repeats its terminus; hub-bound rows
  disambiguated; no blank direction.
- `node qa/melbourne-dogfood-gate.mjs`, `qa/adelaide-dogfood-gate.mjs`, `qa/boston-dogfood-gate.mjs`,
  `qa/greater-manchester-dogfood-gate.mjs` (or the Metrolink gate — find it), `qa/bundled-city-directions.mjs`,
  `qa/live-city-lists-sync.mjs`, `node qa/run-all.mjs --smoke` pass.

## Mechanics
- Lane locks: this touches four countries' providers — `check` and `acquire` `australia`
  (`label-aliases`), `united-states` (`boston-labels`), `united-kingdom` (`metrolink-labels`) before
  editing each; stop and report if any is held.
- Branch from up-to-date `origin/master` (at or after b7f5004). `.env.local` copied in for live
  checks, loaded via `loadEnvLocal()` only, never printed or committed, deleted before committing.
- Smoke in the foreground with a 600000 ms timeout, output to a file you then read; re-run an
  unrelated failing script once in the foreground. Foreground commands with explicit timeouts
  only — no background processes, sleeps or poll loops; stop any dev server (free port, never 3000).
- Commit, push, open a PR titled "Direction labels: server-side legacy aliases; terminus-only
  labels for Boston CR + Metrolink". Do not merge.
