# Jim brief — UK registry note sweep (stale token text, licence copies, ledger pointers)

**Dispatched:** 5 Sep 2026 (Tim's call, sequenced after the four flip PRs and the ledger
catalog follow-ups) · **Lane:** `united-kingdom`, region label `registry-sweep`, stage
`adapter` · **Scope:** prose strings in `lib/providers/registry.js` only. No code, no `status`,
no catalog, no pack edits. Copy this file into the repo as
`docs/jim-brief-uk-registry-sweep.md` and commit it with the change.

## Why

Three statements repeated across the UK entries' `integration` and `notes` strings are now
false, and Nico, Mark and future Jim runs read those strings as truth:

| Stale text (approximate — grep for it) | Count | Truth since |
|---|---|---|
| `DARWIN_LDB_TOKEN not set` / "same account-level blocker" | 14 | token live 2 Sep 2026 |
| "do not relay Darwin data to end users until Tim confirms" / "redistribution terms … unclear" | 3+ | licence read 5 Sep, redistribution permitted (`docs/united-kingdom-ledger.md` §1) |
| "docs/united-kingdom-ledger.md still does not exist" / "overdue" | 3 | ledger merged 5 Sep (PR #225) |

## What to change

For every registry entry whose `timeZone` is `Europe/London` (20 entries; `uk-london-tfl` has
none of these strings, confirm and skip):

1. **Token text.** Replace any clause saying the token is not set / the region is blocked on
   the token with: `Darwin live via the shared uk-darwin.js provider (DARWIN_LDB_TOKEN set 2 Sep
   2026, 20s server-side cache PR #230).` Where the sentence also says "same account-level
   blocker as <list of regions>", drop the list — it was a blocker chain, not a fact about this
   region. If a region is genuinely still not live for a *different* reason (NET feed
   unconfirmed, Supertram no feed, Tyne and Wear Metro GTFS too large, TfW Valley Lines no feed,
   Edinburgh Trams no GTFS, TfWM credentials), keep that reason verbatim — it is the true reason.
2. **Licence text.** Replace every "OpenLDBWS/RDM … redistribution terms … unclear … do not relay
   Darwin data to end users until Tim confirms" sentence with: `Licensing: see
   docs/united-kingdom-ledger.md §1 — RDM Live Departure Board DSA permits redistribution; RDG
   attribution wired (PR #235).` Do the same for any "Open item for Tim only: OpenLDBWS/RDM
   Platform Agreement redistribution terms" sentence.
3. **Ledger pointers.** Replace "docs/united-kingdom-ledger.md still does not exist" / "flagged
   again per docs/country-lane.md's standing retrofit, overdue" with: `Cross-region facts: see
   docs/united-kingdom-ledger.md (stop ownership, verdicts, coverage).`
4. **Nothing else.** Do not reflow, reorder, shorten or "improve" any other sentence, even if
   it looks stale (e.g. Tamworth/Chesterfield/Darlington boundary prose — those are historical
   pack facts the ledger supersedes; leave them). Do not touch non-UK entries. Do not touch
   `status`, `integration` keys other than the strings named, or any field except prose.

Keep each entry's `notes` a valid JS string literal — several are very long single-line strings;
edit in place, do not split them.

## Verification (report the output)

- `node -e "import('./lib/providers/registry.js').then(m => console.log(Object.keys(m).length))"`
  (or however the registry is loaded — check `qa/registry-*.mjs` for the canonical loader) —
  the file must still parse.
- `grep -c "DARWIN_LDB_TOKEN not set" lib/providers/registry.js` → 0.
- `grep -c "until Tim confirms" lib/providers/registry.js` → 0.
- `grep -c "still does not exist" lib/providers/registry.js` → 0.
- `node qa/run-all.mjs --smoke` green (several planned gates read registry prose — e.g.
  rest-of-wales-planned-gate checks "Board eligibility section all-in"; if any gate asserts on
  a string you changed, update the gate's expected string in the same PR and say so).

## Guardrails

- `node qa/lane-lock.mjs check united-kingdom` first; acquire
  `node qa/lane-lock.mjs acquire united-kingdom registry-sweep adapter` before editing.
- Own worktree, branch from `origin/master` after the ledger catalog follow-ups PR has merged
  (it touches the `uk-west-midlands` registry note).
- One PR titled "UK registry sweep: stale Darwin-token, licence and ledger-pointer prose", with
  the grep counts and the release command (`node qa/lane-lock.mjs release united-kingdom
  registry-sweep`) in the body.
