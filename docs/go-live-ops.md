# Go-live ops — Next Train

**Owner:** Tim (execute) · Simon (keep list current) · Jim (instrument when briefed)  
**Support:** EvansAppStudio@gmail.com  
**Constraint:** Tim OOO **27 Sep – 9 Oct** — cover person + alerts must work before 26 Sep  
**Canvas:** `go-live-ops` (planning artifact)

Proportionate for an indie Capacitor app + Vercel `/api` → Transperth. Not enterprise APM.

---

## P0 — do before public / holiday

| # | Item | Who | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | **Uptime** — health + ready + synthetic next-train | Tim | **Done** (Aug 2026) | Three KEYWORD monitors; alerts → EvansAppStudio@gmail.com — see § Uptime |
| 2 | **Crash reporting** on release builds | Jim (SDK) + Tim (Sentry UI) | **App done** — DSN in bundle, events in Issues. **Todo:** GitHub integration + “new issue → GitHub issue” alert (`docs/sentry-integration-now.md`) |
| 3 | **Second Play Console admin** + review email alerts | Tim | **Skipped** (no human buddy yet) | Rely on Uptime + own phone |
| 4 | **Gmail cover** (vacation + forward + templates) | Tim | **Skipped** (Tim 11 Aug) | Templates still in § Support cover if needed later |
| 5 | **Pre-freeze** 24–26 Sep | Tim | Todo | No risky deploys day-of leave |

## P1 — soft launch

| # | Item | Who | Status |
| --- | --- | --- | --- |
| 6 | Min product analytics events | Jim after Tim picks tool | Same brief as crashes |
| 7 | Alert routing (uptime + crashes → Slack/SMS buddy sees) | Tim | After tools exist |

## P2 — later

| # | Item |
| --- | --- |
| 8 | Public status blurb / page during incidents |
| 9 | Deeper CI smoke |

---

## Uptime

Three monitors on **UptimeRobot** (free tier is fine). All hit production:

`https://next-train-app.vercel.app`

**As deployed (Aug 2026):** all three are **KEYWORD** monitors (not plain HTTP) — keyword must **exist** in the response body. Alerts go to **EvansAppStudio@gmail.com** only (free-tier one contact; forward from that inbox if needed). Cursor can manage monitors via UptimeRobot MCP (`mcp.uptimerobot.com`).

### Monitor 1 — Liveness (platform up)

| Field | Value |
| --- | --- |
| **Type** | **KEYWORD** (HTTP 200 + body check) |
| **URL** | `/api/health` |
| **Interval** | 5 minutes |
| **Keyword** | `"ok":true` (alert if **not** found) |
| **Alert when** | Down / keyword missing |

Cheap ping — Vercel function runs. Does **not** load GTFS or call Transperth.

**Local:** `curl http://localhost:3000/api/health`

### Monitor 2 — Readiness (deploy bundle)

| Field | Value |
| --- | --- |
| **Type** | **KEYWORD** (HTTP 200 + body check) |
| **URL** | `/api/ready` |
| **Interval** | 5 minutes |
| **Keyword** | `"ready":true` (alert if **not** found) |
| **Alert when** | Down / keyword missing |

Loads Perth server stack + vendored GTFS unzip (`fflate`) + station allowlist — **no Transperth network call**. Catches missing dependencies in the serverless bundle (e.g. Aug 2026 `fflate` outage where health was green but next-train crashed).

**Local:** `curl http://localhost:3000/api/ready`

### Monitor 3 — Synthetic train (live data path)

| Field | Value |
| --- | --- |
| **Type** | **KEYWORD** (HTTP 200 + body check) |
| **URL** | `/api/next-train?station=Edgewater%20Stn&direction=Perth&destination=Perth&leaveBefore=0&refresh=30&skipTrains=0` |
| **Interval** | 10 minutes |
| **Keyword** | `"displayTime"` (alert if **not** found) |
| **Alert when** | Down / keyword missing |
| **Consecutive failures before alert** | **2** (ignore single blips) |

Full Perth path through Transperth live times. Catches upstream / parser breaks.

### Alert contacts

- **EvansAppStudio@gmail.com** (active on all three monitors)
- **tdrevans@gmail.com** — optional; UptimeRobot free tier allows one contact (skipped Aug 2026)

Enable email on all three monitors. SMS optional on monitor 3 only if you want faster pages.

### UptimeRobot setup checklist (~10 min)

1. ~~Log in → **Monitors** → confirm monitor 1 (`/api/health`) exists.~~ **Done** — KEYWORD monitors live (Aug 2026).
2. ~~**Add monitor** — paste monitor 2 settings from table above → Save.~~ **Done**
3. ~~**Add monitor** — paste monitor 3 settings → set **Alert After** = 2 failures → Save.~~ **Done** (set **Alert after 2 failures** on monitor 3 in Advanced if not already)
4. **Integrations & API → Alert contacts** — EvansAppStudio@gmail.com on all monitors (free tier: one contact).
5. **Test:** open `/api/ready` and `/api/next-train?...` in browser — both should return 200.

### Do not monitor (still `planned`/`retired`)

Brisbane and Sydney flipped `live` weeks ago and are now covered by the production sweep below —
this section used to name them as `planned`/501 and was stale. Rather than hand-list the current
`planned`/`retired` set here (it drifts every wave — as of 10 Sep 2026 it includes Melbourne,
Osaka, Hong Kong, Brussels, Copenhagen, Boston, plus NZ/NL/Canada retired from release 1, see
`docs/jim-brief-release-1-scope-cut.md`), check `lib/providers/registry.js` for the current,
authoritative status list rather than trusting a copy pasted into this doc.

`/api/dev/board?city=<planned-city>` (internal dogfood — gated by `ALLOW_CITY_PROBES=1`).  
`/api/next-train?city=<planned-city>` (returns **501** while not `live`).  
The production sweep below only ever queries `status: "live"` cities for the same reason — it
reads the registry, never a hand-maintained list.

---

## Production sweep (FB-64, added 10 Sep 2026; fixed up same day after a QA FAIL)

`qa/prod-sweep.mjs` extends monitoring past Perth (the only city the three UptimeRobot monitors
above cover) to every `status: "live"` city in `lib/providers/registry.js` — no other file to
update when a city flips or retires, the sweep just picks it up. Full detail:
`docs/jim-brief-prod-sweep.md`, and the fix-up round: `docs/jim-brief-prod-sweep-fixups.md` /
`docs/mark-note-prod-sweep.md`.

**What it covers.** For each live city it samples up to two stations (Perth uses the same
`Edgewater Stn` → `Perth` pair as monitor 3 above), preferring each city's derivable hub station
(from `lib/cities/<city>/direction-hubs.json` where one exists — today, all UK regions; a city
with no such file falls back to the previous alphabetical-first station order). At each sampled
station it fetches `/api/directions`, then calls `/api/next-train` for up to three chips — all
against production, so no agency API keys are ever needed by the sweep itself. A station is only
`empty` once none of its checked chips has a trip; checking only the first chip is what produced
a false Brisbane alert on PR #355 (a genuinely quiet branch terminus happened to sort first).
Each city is then classified:

- **ok** — a sampled station returned an upcoming trip (or a terminus arrival) on any checked chip.
- **empty** — every checked chip at every sampled station returned zero trips, and it's within
  that city's plausible local service hours (a conservative 06:00–23:00 window in the city's own
  `timeZone`).
- **error** — a non-200 response, a malformed body, or a thrown parse, at *any* hour.
- **skipped (outside service hours)** — every checked chip returned zero trips, but it's outside
  that window (e.g. an overnight Underground closure) — reported as a distinct state from "empty"
  so a quiet board never gets read as "checked and healthy" or silently dropped.

**Pacing (FB-64 second fix-up, 10 Sep 2026).** `lib/api-rate-limit.js` allows 60 requests/60s/IP;
the sweep's ~100+ requests across 33 cities used to fire back-to-back, tripping that limiter on
the same eight UK regions every run — a repeatable false alarm, not flake (two independent
consecutive runs produced identical `error=8`, all HTTP 429). The fix paces every request against
`BASE` with a minimum gap (`REQUEST_INTERVAL_MS`, default 1100ms — comfortably under 60/minute),
which is free given the sweep is hourly with no deadline. **`lib/api-rate-limit.js` itself was not
touched** — weakening it to suit a monitor would fix the wrong thing. A full run now takes roughly
3–5 minutes (well inside the workflow's 10-minute job timeout) instead of under a minute. If a 429
does slip through anyway (shared runner IP, etc.), it's never read as a city finding: it's
classified as its own `throttled` outcome (one automatic retry backed off by the server's own
`Retry-After` header first), can never move a city's `consecutiveError`/`consecutiveEmptyInHours`
counter, and is called out in the run's own output as a sweep-pacing defect (`SWEEP PACING
DEFECT: N cities were rate-limited...`) rather than folded into the per-city summary line.

**Alerting.** State (consecutive `error` / in-hours `empty` runs per city) persists between runs
via GitHub Actions cache (`prod-sweep-state-<run id>`, restored by prefix match to the most recent
entry) — **not** a commit to master. An earlier version of this workflow committed
`qa/prod-sweep-state.json` back to the branch every run; QA found that had no precedent in this
repo for a bot push to master, was never verified against master's `web-qa`-required ruleset, and
committed unconditionally (the timestamp always differs) rather than only on a real change. The
cache never touches a protected branch, so it can't be silently rejected by branch protection. Its
trade-off: if the cache is evicted (GitHub's standard 7-day/10GB policy) or this is the very first
run, every city's counters restart at 0 — a real alert is *delayed* by however many fresh runs it
takes to re-cross the threshold, not lost. A city fails the workflow — which reaches Tim through
normal GitHub Actions run-failure email — once it crosses **3 consecutive hourly runs**; a single
bad run logs and exits green, so one flaky upstream response never pages.

**How it runs.** `.github/workflows/prod-sweep.yml` on an hourly cron, plus `workflow_dispatch`
for an ad-hoc run (optionally pointed at a preview deploy via the `base` input). It never runs on
`push` or `pull_request`, is not a required check, makes no writes to the repository (`contents:
read`), and `qa/prod-sweep.mjs` is never registered in `qa/run-all.mjs` at any tier — it cannot
gate a PR.

**By hand:**

```
npm run sweep:prod
# or, against a preview deploy:
PROD_SWEEP_BASE=https://<preview>.vercel.app npm run sweep:prod
```

---

## Crash + analytics

See `docs/jim-brief-crash-analytics.md`. Tim picks tool + pastes DSN/keys; Jim implements. Until then Play Console Vitals only.

---

## Support cover (holiday)

### Gmail vacation (paste)

> Thanks for contacting Next Train / Evans App Studio.  
> I'm away **27 Sep – 9 Oct** and replies will be slower. Urgent Play / crash issues are monitored by the team — include your device model and app version if reporting a bug.  
> Otherwise I'll reply after **10 Oct**.

### Forward / filters

- Forward (or filter → label + notify buddy) messages with: `Play Console`, `crash`, `ANR`, `refund`, `remove ads`, `not working`, `wrong time`
- Optional: Google Group / shared mailbox later — Gmail forward is enough for v1

### Play

- Add cover person as Play Console user (at least **View app information** + **Reply to reviews** + ability to **halt staged rollout** if Tim trusts them)
- Enable email for new reviews / critical alerts to both accounts

### Freeze checklist (24–26 Sep)

- [ ] Staged rollout at intended % (ideally 100% or consciously paused)
- [ ] No last-minute API schema experiments
- [ ] Known-issues one-pager for buddy (widget OEM, reminder battery, ads)
- [ ] Uptime + crash alerts verified with a test page/fail
- [ ] Support templates accessible to buddy

---

## Support reply templates

See `docs/support-reply-templates.md`.

---

## Common fails (cheat sheet)

| Fail | Detect | Respond |
| --- | --- | --- |
| Vercel /api down | Health uptime | Rollback / redeploy; auto-reply note |
| Deploy bundle broken (missing deps) | **Ready** uptime | Fix bundle + redeploy (e.g. vendored `fflate`) |
| Transperth / parser | Synthetic next-train | Fix + deploy; graceful empty in app |
| App crash / ANR | Play + Sentry | Hotfix AAB; halt rollout if early |
| OEM kills alarms | Mail / reviews | FAQ battery; commute strip later |
| Billing / ads | Consoles + events | Restore path; known-issue reply |
| Policy / Data safety | Play email | Buddy escalates; don't invent answers |

---

## Change log

| Date | Note |
| --- | --- |
| 2026-09-10 | FB-64: `qa/prod-sweep.mjs` + hourly `prod-sweep.yml` monitor all 33 live cities (Perth still separately covered by UptimeRobot); corrected stale "Brisbane/Sydney planned" note — `docs/jim-brief-prod-sweep.md` |
| 2026-09-10 | FB-64 fix-up (Mark QA FAIL on PR #355): station "empty" now requires every checked chip empty, not just the first; sampling prefers a derivable hub station; state persistence moved from a commit-to-master to Actions cache (no repo writes) — `docs/jim-brief-prod-sweep-fixups.md`, `docs/mark-note-prod-sweep.md` |
| 2026-09-10 | FB-64 second fix-up: sweep was tripping our own `lib/api-rate-limit.js` on the same eight UK regions every run (repeatable, not flaky) — every request now paced under 60/minute, a 429 is classified as its own `throttled` outcome that can never count as a city finding or move a consecutive-failure counter, and `Retry-After` is honoured on one automatic retry; `lib/api-rate-limit.js` itself unchanged — `docs/jim-brief-prod-sweep-ratelimit.md` |
| 2026-08-13 | Sentry app integration verified; `docs/sentry-integration-now.md` for GitHub alert + Cursor automation |
| 2026-08-11 | First ops doc; `/api/health` added; support templates + Jim crash/analytics brief |
