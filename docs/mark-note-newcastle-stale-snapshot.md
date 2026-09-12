# Mark QA note — PR #356 (`newcastle-stale-snapshot`)

Reviewed against `docs/mark-brief-newcastle-stale-snapshot.md` and
`docs/jim-brief-newcastle-stale-snapshot.md`. Flag-only — no fixes made, nothing pushed, PR not
merged.

## Verdict: FAIL to merge as-is — real blast-radius gap found, plus a factual error in Jim's brief

The code changes in this PR are sound and the smoke suite is clean for the right reason. But the
central question the brief asked me to answer independently — **is Newcastle really the only live
city serving synthetic/unmonitored blob data?** — comes back **no, the gate's own coverage claim is
false**: two other live, blob-backed cities (Malmö, Uppsala) are silently absent from the new gate
and have *no* automated refresh path at all, contradicting the gate's own doc-comment. That is
exactly the class of silent gap this PR exists to close.

## Acceptance criteria (Jim's brief, six items)

1. **Rider gets a real board instead of 500.** Not met and not attempted in this PR — correctly so,
   this needs Tim's TfNSW credential + blob republish, which is out of scope here. Newcastle is
   still down in production as of this review.
2. **PR states which cause was real.** Met. ID-scheme mismatch (synthetic dogfood fixture at
   `gtfs/newcastle.zip`), not staleness — confirmed independently by me: fetched the blob,
   `feed_publisher_name: "next-train newcastle dogfood"`, trips `nlr-beach-0`/`nlr-int-0`, calendar
   `20260101`–`20271231`.
3. **A QA script covers this failure mode.** Met, with caveats below — `qa/gtfs-live-blob-snapshot-integrity.mjs`
   does fail loudly on Newcastle for the right reason, but its coverage is incomplete (see Judgement
   item 1).
4. **Refresh workflow no longer fails daily, or removed with reasoning.** Met for what it claims.
   `.github/workflows/gtfs-refresh.yml` + `scripts/gtfs-refresh-large-feeds.mjs` are deleted; their
   only reason for existing (Amsterdam/Rotterdam's oversized shared OVapi feed) is moot — both
   retired in `efefad1` (7 Sep 2026 release-1 scope cut). No live city depended on that workflow.
   `vancouver` correctly dropped from `lib/gtfs-refresh.js`'s `STANDALONE` list (also retired same
   commit) — nothing live was dropped with it. **But** the surrounding comment block in
   `lib/gtfs-refresh.js` ("NOT covered here (each for its own reason)") still doesn't mention Malmö
   or Uppsala at all — same silent-omission pattern as the new gate (see below).
5. **Checked other live cities for the same staleness risk, said so either way.** Partially met —
   Jim checked Canberra/Brisbane/Gold Coast and reported them healthy (I reproduced this), but did
   not check Malmö/Uppsala, which are also live and blob-backed. That's the gap.
6. **`node qa/run-all.mjs --smoke`, explicit 600000ms timeout.** Run twice by me (see below).
   116 PASS / 1 FAIL on the clean run — the FAIL is `gtfs-live-blob-snapshot-integrity.mjs`,
   expected, for the right reason (Newcastle's dogfood publisher string). `malmo`/`uppsala` dogfood
   gates and `region-selection.mjs` passed clean on this run; an earlier run of mine did show
   `uppsala-dogfood-gate.mjs` and `region-selection.mjs` failing transiently
   (Sweden `ECONNRESET` / a dev-server timeout) — consistent with the brief's note that
   Sweden-feed flakes are known and unrelated. Confirmed by re-running clean.

## The four judgement items

**1. Blast radius — is Newcastle really the only one? NO — this is the headline finding.**
I enumerated every `status: "live"` city in `lib/providers/registry.js` (33 total) and cross-checked
which ones actually read their static GTFS from the shared Vercel Blob store
(`gtfsFixtureBlobUrl`/`blob-fixtures.js`) rather than fetching live from an upstream URL each
request:
- Blob-backed + live: **canberra, gold-coast, newcastle, malmo, uppsala**.
- Live-fetch (not blob-backed, so not the same risk class): brisbane, sydney, adelaide, auckland,
  and the UK/other non-GTFS cities.
- Retired (correctly out of scope): amsterdam, rotterdam, vancouver.

The new gate's `CITIES` array covers canberra, brisbane, gold-coast, newcastle — **it omits Malmö
and Uppsala entirely**, despite its own header comment claiming to cover "every live city whose
GTFS static snapshot is served from the shared … Vercel Blob store." I fetched both blobs directly
to check: they are currently real data (`feed_publisher_name: "Samtrafiken i Sverige AB"`,
`feed_version: 2026-09-06`), so there is no live incident today — but nothing in this codebase would
catch it if that changed, silently, the same way Newcastle's did. Also worth restating plainly per
the brief: **gold-coast's own resolved-share check is skipped by design** (shared multi-mode SEQ
feed), so even among the four cities in scope, gold-coast's content-integrity check is the only
thing verifying it, and that check only inspects one string field (see item 2). A skip is not a
pass, and I'm treating both the gold-coast skip and the malmo/uppsala omission as findings, not
noise.

I also checked the two included-but-anomalous cases:
- **Brisbane is in the gate's `CITIES` list but is not actually blob-backed** — `loadBrisbaneStatic()`
  fetches live from Translink's `SEQ_GTFS_STATIC_URL` every time, no blob dependency
  (`lib/providers/brisbane.js` has no `blob-fixtures` import). The gate's content-integrity check
  still queries `gtfsFixtureBlobUrl("brisbane")` regardless — I confirmed a `gtfs/brisbane.zip`
  blob does exist and currently returns a legitimate feed, but it is disconnected from what
  Brisbane's live board actually serves. This isn't a live incident, but it means Brisbane's
  content-integrity result in this gate proves nothing about production risk — it's checking an
  unused artifact. Worth a follow-up: either drop brisbane from the content-integrity half of the
  list, or note explicitly that it's inert.
- Confirmed `lib/gtfs-refresh.js`'s `STANDALONE`/`SHARED_GROUPS` also never covered Malmö/Uppsala
  (not in the arrays, not in the documented "NOT covered here" skip list, not in any
  `.github/workflows/*.yml` I could find) — this predates this PR, but this PR is exactly the one
  that should have caught and named it, since its whole premise is "audit every live blob-backed
  city."

**Recommendation: this is a real gap, not a nitpick.** I'd ask Jim to add Malmö and Uppsala to both
`qa/gtfs-live-blob-snapshot-integrity.mjs`'s `CITIES` array and to `lib/gtfs-refresh.js`'s coverage
(or explicitly document why they're intentionally excluded, the way vancouver/amsterdam/rotterdam
now are) before I'd call this PR's stated goal ("verify no other live city is in the same state")
actually met.

**2. Does the heuristic catch a differently-named fixture? Thin — no.**
`SYNTHETIC_PUBLISHER_MARKERS` is five hardcoded substrings
(`next-train`, `dogfood`, `fixture`, `placeholder`, `synthetic`) matched only against
`feed_info.feed_publisher_name`. Two ways this fails open, both easy to hit by accident, not just
adversarially:
- If `feed_info.txt` is absent from the zip entirely (several of the trim scripts write it only
  `if (feed) …`, i.e. conditionally), `fetchFeedInfo` returns `null`, `publisher` becomes `""`, no
  marker matches, and `checkContentIntegrity` silently passes — zero verification, not a caught
  case.
- A fixture whose feed_info.txt was copied/reused from a prior real publish (a very plausible way to
  make a "realistic-looking" dogfood fixture) would carry a real agency name and sail through.
This is a single-field, single-vocabulary signature check with no fallback (e.g. cross-checking
trip-ID naming convention, route/stop names against the catalog, or agency_id). It would have missed
Newcastle's own incident if whoever built that fixture had named the publisher anything other than
one of those five words. I'd treat this as thin-but-better-than-nothing, not "robust."

**3. Deleting `gtfs-refresh.yml` / `gtfs-refresh-large-feeds.mjs` — no live city loses a refresh
path.** Confirmed against `efefad1` (retires amsterdam, rotterdam, vancouver): the workflow's whole
reason for existing was Amsterdam/Rotterdam's oversized shared OVapi feed, both retired; no live
city used it. `vancouver` correctly dropped from `STANDALONE` too (also retired same commit). This
part of the PR is correct as scoped. The gap is what it doesn't say (item 1/5 above): the deleted
workflow's own header comment claimed "the Vercel cron … still covers every other Blob-backed city,"
which was already false before this PR (Malmö/Uppsala) and remains false after it.

**4. Publish-script guard — real improvement, easy to defeat by habit, not by accident.**
`scripts/publish-gtfs-fixture-to-blob.mjs` now checks the registry and refuses to publish over a
`status: "live"` city unless `--allow-live` is passed, with a clear multi-line warning explaining
why. This genuinely closes the accidental path (the likely Newcastle mechanism: someone ran the
script without realizing the city had since gone live). It would **not** stop a deliberate-but-wrong
override — `--allow-live` is a single flag, no re-typing the city name, no confirmation prompt, no
distinction between "I'm republishing real data" and "I'm testing and this is annoying me." Given
this is the exact failure class the PR is trying to prevent, I'd suggest (not block on) requiring the
city name be typed again as a second argument when `--allow-live` is used, so the override can't be
habit-typed without re-reading which city it's pointed at.

## Also verified

- **`board.js` message clarification**: correct and additive only — the zero-resolved suffix is
  accurate to what actually happened and doesn't change any threshold or control flow. One loose
  end I noticed but wasn't asked to check: `lib/providers/gtfs/errors.js`'s doc-comment still
  classifies `GtfsSnapshotStaleError` as always-retryable ("a fresh refresh … can genuinely fix
  this"), which this PR's own root-cause finding shows isn't true for the zero-resolved/ID-mismatch
  case — `errors.js` itself wasn't touched to reflect that. Not blocking, just worth a follow-up
  note since `api/directions.js`'s `classifyDirectionsError` still routes this error class to the
  "try again" treatment for riders.
- **No credential leakage**: grepped the full diff for `TFNSW_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and
  similar — every occurrence is a variable/env-var *name*, never a value. Clean.
- **Calendar expiry sweep (Jim's brief item 5, brief's "also verify"):** I recomputed
  `snapshotCalendarRange` (the exact function `checkSnapshotFreshness` uses at runtime) directly
  against each city's real published/live GTFS:
  - canberra: covers to **2027-07-29** — safe.
  - brisbane: covers to **2026-11-09**.
  - gold-coast: covers to **2026-10-28**.
  - malmo: covers to **2026-12-12** — safe, and blob-backed (see item 1 — no gate/refresh coverage
    regardless).
  - uppsala: covers to **2026-12-12** — safe, same caveat.
  - adelaide: covers to **2027-04-09** — safe.
  - **Jim's brief item 5 says brisbane and gold-coast "both expire 2026-10-28." That's only correct
    for gold-coast. Brisbane's real max calendar coverage is 2026-11-09, not 2026-10-28** (confirmed
    twice, isolated run, from `loadBrisbaneStatic()`'s live-fetched calendar.txt — max end_date row
    is service `WBS 26_27-42910`, `20260910`–`20261109`). This should be corrected in the written
    record even though it doesn't change the conclusion much (both are still near-term).
  - **Neither date falls inside Tim's 27 Sep – 9 Oct away window** — gold-coast's Oct 28 and
    brisbane's Nov 9 both land *after* he's back. Nothing I found expires unmonitored during that
    specific window. Both are still worth a calendar refresh before/soon after those dates land,
    just not urgently during the blackout window itself.
- **Is shipping the gate red acceptable? My view, not a waiver, as asked:** ship it red, but not as
  a bare, indistinguishable FAIL. A permanently-red smoke-tier gate that looks identical to a real
  regression is exactly the "gets ignored" failure mode the brief is worried about — and `run-all.mjs`
  already has a precedent for distinguishing expected-flaky from real failure (`PASS (passed on
  retry)`). I'd ask for the same treatment here: either an explicit "known failing, tracked in
  `docs/jim-brief-newcastle-stale-snapshot.md`, blocks nothing else" annotation in the summary output
  until Tim republishes, or (my preference) a `NEXT_TRAIN_ALLOW_KNOWN_STALE_NEWCASTLE`-style
  allowlist the gate itself checks and reports as `FAIL (known, tracked)` rather than a bare `FAIL`.
  Shipping it silently red with no distinguishing marker, indefinitely, is how a real second failure
  in this same script gets missed later. This is a should-fix-soon, not a blocker on this PR — the
  gate existing and being wired into the smoke tier is strictly better than not.

## What Tim must do — the outage does not end until this happens

1. **Republish real Newcastle GTFS static data** to `gtfs/newcastle.zip` (needs a valid TfNSW
   credential) — the current blob is the synthetic dogfood fixture
   (`feed_publisher_name: "next-train newcastle dogfood"`, calendar `20260101`–`20271231`).
2. **Verify `TFNSW_API_KEY`/`BLOB_READ_WRITE_TOKEN`** are valid in both GitHub Actions secrets and
   the Vercel project env — the deleted workflow had been failing daily since 8 Sep on a missing
   `BLOB_READ_WRITE_TOKEN`; confirm that isn't also silently broken for the credentials Newcastle's
   *live* refresh path needs.
3. Decide whether to ask Jim for a follow-up covering Malmö/Uppsala in the new gate before treating
   "no other live city is in this state" as verified — as it stands, that claim is not yet true of
   this PR.

I did not touch any credential, blob, or republish operation myself, per the brief.

## Suite run

`node qa/run-all.mjs --smoke`, explicit 600000ms timeout, run twice (first run hit background
auto-timeout past 600s with two transient extra failures that did not reproduce; second, clean run
completed in 506s): **116 PASS / 1 FAIL** — the 1 FAIL is `gtfs-live-blob-snapshot-integrity.mjs`,
expected, failing on Newcastle for the documented reason. No dev server or background process left
running afterward (checked: no LISTENING socket on :3000, no background tasks alive).
