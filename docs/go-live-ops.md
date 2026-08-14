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
| 1 | **Uptime** — health + ready + synthetic next-train | Tim | **In progress** — health live; add ready + next-train monitors | See § Uptime |
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

### Monitor 1 — Liveness (platform up)

| Field | Value |
| --- | --- |
| **Type** | HTTP(s) |
| **URL** | `/api/health` |
| **Interval** | 5 minutes |
| **Keyword** | `"ok":true` (alert if **not** found) |
| **Alert when** | Down / keyword missing |

Cheap ping — Vercel function runs. Does **not** load GTFS or call Transperth.

**Local:** `curl http://localhost:3000/api/health`

### Monitor 2 — Readiness (deploy bundle)

| Field | Value |
| --- | --- |
| **Type** | HTTP(s) |
| **URL** | `/api/ready` |
| **Interval** | 5 minutes |
| **Keyword** | `"ready":true` (alert if **not** found) |
| **Alert when** | Down / keyword missing |

Loads Perth server stack + vendored GTFS unzip (`fflate`) + station allowlist — **no Transperth network call**. Catches missing dependencies in the serverless bundle (e.g. Aug 2026 `fflate` outage where health was green but next-train crashed).

**Local:** `curl http://localhost:3000/api/ready`

### Monitor 3 — Synthetic train (live data path)

| Field | Value |
| --- | --- |
| **Type** | HTTP(s) |
| **URL** | `/api/next-train?station=Edgewater%20Stn&direction=Perth&destination=Perth&leaveBefore=0&refresh=30&skipTrains=0` |
| **Interval** | 10 minutes |
| **Keyword** | `"displayTime"` (alert if **not** found) |
| **Alert when** | Down / keyword missing |
| **Consecutive failures before alert** | **2** (ignore single blips) |

Full Perth path through Transperth live times. Catches upstream / parser breaks.

### Alert contacts

- **tdrevans@gmail.com**
- **EvansAppStudio@gmail.com**

Enable email on all three monitors. SMS optional on monitor 3 only if you want faster pages.

### UptimeRobot setup checklist (~10 min)

1. Log in → **Monitors** → confirm monitor 1 (`/api/health`) exists.
2. **Add monitor** — paste monitor 2 settings from table above → Save.
3. **Add monitor** — paste monitor 3 settings → set **Alert After** = 2 failures → Save.
4. **My Settings** → confirm both emails receive alerts.
5. **Test:** open `/api/ready` and `/api/next-train?...` in browser — both should return 200.

### Do not monitor (until city is live)

`/api/dev/board?city=brisbane`, `?city=sydney`, or `?city=melbourne` (internal dogfood — gated by `ALLOW_CITY_PROBES=1`; Sydney needs `TFNSW_API_KEY`, Melbourne needs `PTV_DEVID` + `PTV_API_KEY`).  
`/api/next-train?city=brisbane`, `?city=sydney`, or `?city=melbourne` (returns **501** while `planned`).  
No synthetic checks for non-Perth cities until Tim flips them live — see `docs/mark-dogfood-brisbane.md`.

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
| 2026-08-13 | Sentry app integration verified; `docs/sentry-integration-now.md` for GitHub alert + Cursor automation |
| 2026-08-11 | First ops doc; `/api/health` added; support templates + Jim crash/analytics brief |
