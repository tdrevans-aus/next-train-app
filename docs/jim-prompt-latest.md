# Jim task prompt — latest (Play bull run)

**Date:** 2026-08-11 (updated ~11:40 — security batch done)  
**For:** Jim (Tim sends: “Jim — go code docs/jim-prompt-latest.md”)  
**Program:** Play public ~18 Sep, 100% rollout by 26 Sep, Tim holiday 27 Sep–9 Oct  
**Blockers:** `docs/launch-blockers.md`

---

```
## Repo guardrails

- Capacitor web app in public/ + Android native in android/app/src/main/java/com/tdrevans/nexttrain/
- Briefs in docs/jim-brief-*.md are the spec. Don’t edit them unless Tim asks; flag gaps before guessing.
- Perth times: Australia/Perth.
- Don’t git commit or push unless Tim asks.
- When done: list files changed, how to test on device/emulator, anything blocked.
- After web UI changes that must show in the Android app: run `npm run cap:sync` (Tim expects this every time).
- API changes need a Vercel deploy to hit production — note that for Tim when S-03 is done (Tim deploying).

## STOP / redirect

- **Do not** implement Reminder home / Leave alerts hub (Option B in docs/jim-brief-reminders-simple-sexy.md).
- **Do not** implement preferred-time-arms-reminder (Option C).
- **Do not** implement docs/jim-brief-widget-nearby-live-cache.md (SUPERSEDED).
- **Do not** restrict API CORS origins (S-03 B deferred — keep `*`).
- **Do not** build server-side IAP receipt verify (S-05 accept).
- **Do not** chase S-07 (CSP, FileProvider, App Links, ProGuard) unless Tim asks.

## Shipped — do not redo

- Security S-01→S-06 (LB-01 code DONE 11 Aug)
- Widget Phase A / B / C + designed idle / twin layout polish (device sign-off is Tim’s)
- Reminder settings sheet **removed** (nuclear IA): Remind me + Live countdown on journey (with target); Menu → Pause reminders only — `docs/jim-brief-reminders-nuclear-ia.md`
- Near me cache; leave hide after grace; ad-free menu visibility
- Delete last journey empty-state (qa PASS)

## Task — next (stand by + optional)

0. **P0 Console unblock (do first if Tim sends this brief):** `docs/jim-brief-remove-commute-fgs.md` — delete dead Heading-to-station FGS / `FOREGROUND_SERVICE_DATA_SYNC`. Other dead artefacts are listed in `docs/dead-code-inventory.md` (**D-02+**) for closed-testing **v2** — do not expand scope into that batch on this AAB.
1. **Stand by** for Tim device fails on TESTING.md **22** (widget) and **17–19** (reminders). Fix only what Tim reports red.
2. **Multi-city adapters (build, don’t enable):** start **`docs/jim-brief-brisbane-provider.md`** (shared GTFS + Brisbane). Then Sydney / Adelaide / Canberra (reuse GTFS); Melbourne can parallel (PTV). **Do not** flip any city to `live` or ship multi-city UI. Design: `docs/multi-city-provider-design.md`.
3. **Optional:** full web `qa/` regression after security batch; fix any new FAIL before Tim’s closed AAB.
4. **Near me + ads (Tim 12 Aug):** `docs/jim-brief-sticky-ad-scroll-directions.md` — sticky ad dock; scroll Other directions above; optional 4 + More. Don’t put ads above the list.
5. When Tim clears or parks LB-02/03, P2 is unblocked:

### P2 — Founding Pro (monetisation)
`docs/jim-brief-founding-pro.md` — design strip `public/design/founding-pro.html`. Expand Remove-ads → Pro (widget + no ads). **Do not** ship a crippled free widget.

### P2 — City adapters (queue)
| Order | Brief |
|-------|--------|
| 1 | `docs/jim-brief-brisbane-provider.md` |
| 2 | `docs/jim-brief-sydney-provider.md` |
| ~ | `docs/jim-brief-melbourne-provider.md` (can parallel) |
| 3 | `docs/jim-brief-adelaide-provider.md` |
| 4 | `docs/jim-brief-canberra-provider.md` |

### P2 — Backup glance
`docs/jim-brief-commute-strip-notification.md` — **ready** (non-FGS ongoing notif; Tim prioritising). Do **not** resurrect Heading FGS / `CommuteNotificationService`.

### P2 — Crash + analytics (when Tim pastes credentials)
`docs/jim-brief-crash-analytics.md` — crashes first; min events optional. Ops checklist: `docs/go-live-ops.md`.

### P2
docs/jim-brief-station-picker-list-first.md```
