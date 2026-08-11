# Stickiness ideas — ranked backlog

**For:** Tim / Simon (design) / Jim (when building)  
**Metric:** Journey-saver retention — **D1 / D7 / D30** (see `docs/business-marketing-plan.md` §2.6)  
**Status:** Living backlog — work top-down; revisit after Perth 90-day learnings  

**How to read the table**

| Column | Meaning |
|--------|---------|
| **Rank** | Suggested build / invest order for stickiness (1 = do first) |
| **Idea** | Retention surface or habit loop |
| **Impact** | Likely effect on Journey-saver D1/D7/D30 |
| **Effort** | Build + maintain cost for this stack (Capacitor, unofficial live API) |
| **Fit** | Why this rank — beachhead / sequencing note |

Impact & effort use: **Very high / High / Medium / Low**.

---

## Ranked backlog

| Rank | Idea | Impact | Effort | Fit |
| ---: | ---- | ------ | ------ | --- |
| 1 | **Homescreen widget** (leave-by + next train for active journey; tap → app) | Very high | Medium | **Shipped (Android)** — design: `docs/widget-homescreen.md` |
| 2 | **Leave-by local notification** (opt-in; preferred train + days; once/window) | Very high *if correct* | **High** | v1 shipped naive; **v2 brief: `docs/jim-brief-leave-reminders-v2.md`** |
| 3 | **Disruption push** (only when *their* journey’s service is delayed/cancelled) | Very high | Medium–high | Trust + “open when it matters”; needs reliable change detection; don’t spam |
| 4 | **Lock-screen / Live Activity (iOS) + Android ongoing / shade strip** | High | Medium | **Android backup briefed:** `docs/jim-brief-commute-strip-notification.md` — preferred-train window only, not all-day Near me |
| 5 | **Morning briefing notification** (fixed wake window: “Leave by 7:42 · Edgewater → Perth”) | High | Low–medium | Cheap ritual anchor on weekdays; easy to over-notify — respect active hours |
| 6 | **Deep links + Shortcuts / Siri / Google Assistant** (“When do I leave?”) | Medium | Low–medium | Low effort sticky for power users; good store/marketing demos |
| 7 | **CarPlay / Android Auto “Leave by” glance** | Medium–high | High | Real car path for park-&-ride; broader than Tesla-only |
| 8 | **Watch complication + leave-by haptic** (Wear OS / watchOS) | Medium | High | Strong for watch owners; small % of SAM; after phone widget + notifs |
| 9 | **Weekend / off-window quiet mode** (suppress commute noise outside active hours) | Medium | Low | Protects D30 by reducing annoyance churn; supports all notif ideas |
| 10 | **Miss-train recovery UI** (“You missed it · next is …”) | Medium | Low–medium | Turns failure into a reason to reopen; reinforces Journey mode |
| 11 | **Widget variants** (compact vs rich: platform, delay badge, “updated ago”) | Medium | Medium | Improves widget trust/retention *after* v1 widget ships |
| 12 | **Bluetooth-to-car → open Journey / show leave-by** | Medium | Medium | Nice automation; flaky permissions; after core glances exist |
| 13 | **Weekly commute recap** (in-app or optional notif: on-time days) | Low–medium | Low | Light habit reinforcement; easy to feel spammy — keep optional |
| 14 | **Assistant-driven “pre-leave” checklist** (keys / weather one-liner) | Low–medium | Medium | Delight; weak core retention vs leave-by number itself |
| 15 | **Calendar “Leave for train” blocks** from active hours | Low–medium | Medium | Visible in existing ritual apps; permission friction; duplicate of notifs for some |
| 16 | **Streaks / commute-day badges** | Low–medium | Low | Can feel gimmicky for a calm utility; test only if metrics stall |
| 17 | **Tesla-specific dash integration** | Low | High | Tiny overlap (Tesla ∩ Transperth commute); PR candy, not D30 driver |
| 18 | **Home Assistant / smart lights at leave-by** | Low | High | Niche delight; support burden; not beachhead |
| 19 | **Wallet / live pass-style card** | Low | High | Stretch platform APIs; unclear Transperth fit |
| 20 | **Household / shared journey** | Low–medium | High | Retention via social; privacy + sync complexity — park for post-beachhead |
| 21 | **Multimodal leave-by** (bike/scooter + train) | Medium (long-term) | Very high | Expands job-to-be-done; dilutes leave-by focus before city #2 |
| 22 | **Wearable haptics-only product** (no watch UI) | Low | Medium | Subset of watch work; fold into #8 rather than separate track |

---

## Suggested 90-day cut (Perth sprint)

**Done / in dogfood (Android):**

1. Widget  
2. Leave-by notification  
3. Quiet / active-hours respect baked into scheduling  

**Still open:**

4. Disruption push **if** feed makes it trustworthy  
5. Deep links / assistant as polish  

Explicitly **not** in the first stickiness tranche: Tesla, smart home, wallet, shared journeys, full multimodal.

---

## Working notes

- Rank optimises for **Journey-savers**, not Nearby-only openers.  
- Widget + leave-by notif share logic: *which journey is active, leave-by instant, stale handling*. Design that once.  
- Measure: D1/D7/D30 among users with ≥1 saved journey; optionally segment **widget adders** vs not.  
- Re-rank after first 30 days of real retention data.

---

## Change log

| Date | Note |
|------|------|
| 2026-08-09 | Initial ranked backlog from stickiness brainstorm (widget / watch / car discussion) |
| 2026-08-09 | Ranks 1–2 marked shipped (Android) after app audit |
