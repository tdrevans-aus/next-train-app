# Mark QA note — Copenhagen

Date: 2026-09-26. Reviewed: `lib/providers/copenhagen.js`, `lib/providers/rejseplanen.js`,
`lib/cities/copenhagen/marketing-directions.js`, `lib/cities/copenhagen/dogfood-next-train.js`,
`docs/copenhagen-d1/*`, `docs/denmark-ledger.md`, `qa/copenhagen-dogfood-gate.mjs`.

Registry: `status: "planned"`, `adapterReady: true`. This is **not** a live-flip QA pass — no
instruction to flip this city was given, and the adapter is deliberately schedule-only (no
Rejseplanen API key). Reviewed as a normal wired-adapter check.

## Verdict: green on everything reviewable in this sandbox; two items could not be verified
live because the sandbox proxy blocks the required hosts (environmental, not a defect).

## Checklist

1. **v1 scope cut** — PASS. `mapGroupOf`/`tripAllowed` in `lib/providers/copenhagen.js` allow
   only Metro M1–M4 (all 44 stations), S-tog at the four named shared stations
   (`sharedOperators.stog` allow-list per catalog entry), and DSB Regional/InterCity/
   InterCityLyn/Öresundståg at those same four stations (`sharedOperators.dsbOresundstag`).
   EuroCity/SJ X2000/České dráhy ComfortJet/buses/ferries are excluded by construction
   (`classifyDsbService` has no branch for them, `mapGroupOf` returns null for unmatched
   codes). Matches oracle-clash-report.md's Board eligibility table exactly.

2. **Hub lock / doNotGroup** — PASS (code review + gate assertions, network-independent parts
   ran). Kongens Nytorv is `COPENHAGEN_HUB`, guarded by `isForbiddenHubProxy` so Nørreport/
   København H/Nørrebro/Nordhavn/Orientkaj/Havneholmen/København S can never stand in for it;
   `qa/copenhagen-dogfood-gate.mjs` asserts this offline (lines ~168–170) and passed those
   specific assertions before the live-fetch step failed. doNotGroup for Nørreport (3-way),
   Nørrebro (2-way), København H (4-way), Nordhavn (2-way, 5-of-6 S-tog lines, H2 correction
   against the oracle report's "six lines" claim) is enforced via each catalog entry's
   `sharedOperators` allow-lists rather than a shared filter — correct per-station scoping.

3. **DST** — PASS. `COPENHAGEN_TIME_ZONE = "Europe/Copenhagen"` is passed through to
   `buildBoardForStops` as an IANA zone (not a fixed offset), matching the shared GTFS board
   builder used by every other city — no hand-rolled DST logic to audit.

4. **Response-shape conformance** — PASS. `fetchStationBoard` returns
   `{ stationName, lastUpdate, trips, realtime }`, matching the shared adapter contract used
   by `buildBoardForStops` consumers elsewhere in the repo.

5. **Board eligibility section (oracle report)** — PASS. `docs/copenhagen-d1/oracle-clash-report.md`
   has a full Board eligibility section with a verdict for every observed service (Metro `in`,
   S-tog `in`, DSB Regional/IC/ICL `in`, Öresundståg `in`, EuroCity/SJ X2000/České dráhy
   ComfortJet `out-reservation`, harbour buses `out-mode`) — no `undecided` rows.

6. **Board eligibility filtering match (sampled board)** — **NOT VERIFIED LIVE**
   (environmental). `qa/copenhagen-dogfood-gate.mjs` is written to sample a real board and
   assert `in` services (RE/IC/ICL/Öresundståg codes) appear and `out-*` services (EuroCity/
   SJ X2000/České dráhy) do not, plus the Kongens Nytorv Metro-only chip assertion — but it
   needs a live pull of `https://www.rejseplanen.info/labs/GTFS.zip`, which this sandbox's
   proxy returns `403` for (confirmed via `curl $HTTPS_PROXY/__agentproxy/status` — rejseplanen
   is one of the blocked hosts noted in the dispatch brief). Code review of `tripAllowed`/
   `mapGroupOf`/`classifyDsbService` supports the intended behavior, and per-file comments
   record this exact filtering was already confirmed live once, 20 Sep 2026 (two real fixes
   landed then: RE/IC/ICL were being silently dropped because they carry route_short_name, not
   route_long_name/route_desc; M2's live headsign for Lufthavnen didn't fold-match). I could
   not re-confirm that live pull myself this session.

7. **`realtime: true` + every mode live, checked at `/api/board`/`/api/directions`, not just
   `fetchStationBoard()` in isolation** — PASS as schedule-only-and-honest, not as live. Per
   file header comments, no Rejseplanen API 2.0/SIRI-ET key is registered (task explicitly
   forbids signing up for one), so `fetchStationBoard` returns `realtime: false` deliberately —
   this is the *opposite* of the Boston-subway defect this rule exists to catch (a mode that
   claims live but is schedule-only); Copenhagen correctly declares itself schedule-only.
   Since the city stays `planned` and is not in `MULTI_CITY_IDS` yet, `/api/board` and
   `/api/directions` do not route to Copenhagen at all pre-flip (confirmed by
   `isMultiCity("copenhagen") === false` assertion in the dogfood gate) — there is no
   rider-facing endpoint to sample yet for this city. Re-check this item at flip time once a
   real-time key path (or an explicit schedule-only decision) is wired.

8. **Ledger consistency** (`docs/denmark-ledger.md`) — PASS / N/A. The ledger is an explicit
   "light pass only" — it records the provider decision (Rejseplanen as shared national
   platform, config-over-shared-provider architecture) but *defers* the stop-ownership and
   national-service-verdict sections until Aarhus is actively scoped, since Copenhagen is
   currently the only planned Danish region. There is no stop-ownership table to check
   Copenhagen's 44 stations against, and the ledger's provider decision is consistent with
   what `lib/providers/copenhagen.js`/`rejseplanen.js` actually implement (shared-provider
   config, not a per-city clone) — no contradiction found.

9. **`qa/copenhagen-dogfood-gate.mjs`** — offline assertions passed (registry shape,
   `assertCityLive` 501/planned, `isMultiCity` false, D1 pack presence, hub-proxy guards,
   forbidden-name guards); the gate then does a real `GTFS.zip` fetch from
   `rejseplanen.info` for the live-payload assertions (RE/IC/ICL classification, Nordhavn/
   Nørreport line-count corrections, Kongens Nytorv chip check, board-eligibility sampling)
   and that fetch returned **HTTP 403 from the sandbox's outbound proxy** — an environmental
   block, not a code failure. Confirmed via `curl "$HTTPS_PROXY/__agentproxy/status"`.

10. **`node qa/run-all.mjs --smoke`** — ran to completion after `npm install` (node_modules was
    absent in this fresh worktree). 37 script failures, all environmental:
    - ~30 Playwright-driven scripts (`smoke-browser`, `region-selection`,
      `help-coverage-entry`, `london-*`, ad-placement scripts, onboarding scripts, etc.) fail
      with `browserType.launch: Executable doesn't exist at
      /opt/pw-browsers/chromium_headless_shell-...` — the Playwright browser binary/CDN this
      sandbox needs is one of the blocked download hosts noted in the dispatch brief.
    - 7 scripts hit live third-party feeds returning `403` via the proxy: this city's own
      `copenhagen-dogfood-gate.mjs` (rejseplanen.info), `adelaide-dogfood-gate.mjs`
      (gtfs.adelaidemetro.com.au), `boston-dogfood-gate.mjs` (MBTA V3 API), and
      `country-wide-picker.mjs`/`no-live-feed-stops-gate.mjs` (blob storage / another blocked
      host) — none of these are Copenhagen-specific regressions; Adelaide and Boston failing
      the identical way for unrelated feeds confirms this is the sandbox's network policy, not
      a Copenhagen defect.
    No failure in this run was attributable to logic in `lib/providers/copenhagen.js`,
    `lib/cities/copenhagen/*`, or the registry entry.

## Blockers (all environmental, none code-level)
- `rejseplanen.info` (GTFS.zip) — blocked by sandbox proxy (403), blocks item 6 and the
  live-payload half of item 9.
- Playwright browser binary/CDN — blocked, unrelated to Copenhagen, blocks ~30 smoke scripts
  citywide.
- `/api/board` / `/api/directions` sampling for item 7 is moot pre-flip since Copenhagen isn't
  in `MULTI_CITY_IDS` yet — nothing to sample.

## Recommendation
Everything checkable without network access is consistent with the D1 pack and
`docs/board-eligibility-rule.md`. Given items 6 and the live half of 9 could not be
re-verified in this sandbox (though comments in the code record they were confirmed live once,
20 Sep 2026), I'm not calling this "fully green" for a flip decision — re-run
`node qa/copenhagen-dogfood-gate.mjs` and `node qa/run-all.mjs --smoke` from an environment with
outbound access to `rejseplanen.info` and the Playwright CDN before treating this as flip-ready.
No flip PR opened. This city also was not asked to flip — it stays `status: "planned"` with no
registry changes from this pass.
