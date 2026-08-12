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
| 1 | **Uptime** on `GET /api/health` (+ optional synthetic next-train) | Tim | **Done** (UptimeRobot + activate emails) | See § Uptime |
| 2 | **Crash reporting** on release builds | Tim + agent | **Done** — DSN live, Issues receiving events, Cursor Sentry→fix automation | High-priority email optional; GitHub-create alert off |
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

**Liveness (always):**  
`https://next-train-app.vercel.app/api/health`  
Expect **200** + JSON `{ "ok": true, ... }`. No Transperth call — tells you the function platform is up.

**Synthetic (recommended second check):** every 5–15 min  
`https://next-train-app.vercel.app/api/next-train?station=Edgewater%20Stn&direction=Perth`  
Expect **200**. Catches upstream / parser breaks. Tolerate rare 5xx (don’t page on single blip — alert on consecutive fails).

**Do not monitor (until city is live):**  
`/api/dev/board?city=brisbane`, `?city=sydney`, or `?city=melbourne` (internal dogfood — gated by `ALLOW_CITY_PROBES=1`; Sydney needs `TFNSW_API_KEY`, Melbourne needs `PTV_DEVID` + `PTV_API_KEY`).  
`/api/next-train?city=brisbane`, `?city=sydney`, or `?city=melbourne` (returns **501** while `planned`).  
No UptimeRobot / synthetic checks for non-Perth cities until Tim flips them live — see `docs/mark-dogfood-brisbane.md`.

**Setup (Tim, ~15 min):** Better Stack, Checkly, or UptimeRobot → ping health 1–5 min → SMS/email/Slack to Tim **and** cover person.

**Local:** `curl http://localhost:3000/api/health`

---

## Crash + analytics

See `docs/jim-brief-crash-analytics.md`. Tim picks tool + pastes DSN/keys; Jim implements. Until then Play Console Vitals only.

---

## Support cover (holiday)

### Gmail vacation (paste)

> Thanks for contacting Next Train / Evans App Studio.  
> I’m away **27 Sep – 9 Oct** and replies will be slower. Urgent Play / crash issues are monitored by the team — include your device model and app version if reporting a bug.  
> Otherwise I’ll reply after **10 Oct**.

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
| Transperth / parser | Synthetic next-train | Fix + deploy; graceful empty in app |
| App crash / ANR | Play + Sentry | Hotfix AAB; halt rollout if early |
| OEM kills alarms | Mail / reviews | FAQ battery; commute strip later |
| Billing / ads | Consoles + events | Restore path; known-issue reply |
| Policy / Data safety | Play email | Buddy escalates; don’t invent answers |

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | First ops doc; `/api/health` added; support templates + Jim crash/analytics brief |
