# Go / no-go metrics — how we’ll measure

**Owners:** Tim (instrumentation + weekly read) · Simon (targets sanity)  
**Status:** Draft — set numeric bars after ~7–14 days of closed beta / soft launch data  
**Related:** Business plan §2.6 · §3.4  

---

## 1. What “go” means (~90 days)

Enough signal that Journey-savers come back, ads/IAP plumbing works, and the live feed isn’t a support firehose — then expand (city #2), not before.

---

## 2. Metrics to track


| Metric | What it is | Where to see it | Journey-saver focus? |
| ------ | ---------- | ---------------- | -------------------- |
| **Installs** | New installs (Play / App Store) | Store consoles | Context |
| **Activation — Nearby** | First session saw Nearby board | Analytics event `nearby_view` | Soft |
| **Activation — Journey save** | ≥1 journey configured | `journey_save` | **Yes — primary** |
| **D1 / D7 / D30** | % of Journey-savers who open app again after 1 / 7 / 30 days | Analytics cohort | **Yes — stickiness** |
| **Wrong-time reports** | Support / beta feedback count | Spreadsheet / inbox | Quality gate |
| **Ads** | Impressions / estimated revenue; not stuck in test mode | AdMob + Play | Money plumbing |
| **Remove-ads IAP** | Purchases / try rate | Play + App Store + `adfree_*` events | Money |
| **QR `src=`** | Hits per venue code | Server logs / short links | Channel test |

---

## 3. Minimum instrumentation (Tim)

If nothing else, log:

1. `app_open`  
2. `nearby_view`  
3. `journey_save`  
4. `journey_open` (Journey mode shown)  
5. `adfree_purchase_success` (when live)  

Use a lightweight tool (e.g. Plausible/PostHog/Firebase) **or** Play Console + a simple event endpoint — pick one and stick to it. No PII.

**Journey-saver cohort definition:** user with `journey_save` ≥ 1.

**Retention:** among that cohort, any `app_open` on day 1 / 7 / 30 after first save (calendar day in Perth time).

---

## 4. Draft bars (replace with real targets after beta week 1)


| Gate | Draft bar (illustrative — not gospel) | Fail signal |
| ---- | ------------------------------------- | ----------- |
| Journey save rate | ≥ **25–40%** of weekly actives save a journey by day 7 | &lt;15% after clear onboarding |
| D7 Journey-savers | Set from beta baseline; aim **meaningfully above** “open once and ghost” | D7 ≈ 0 with &gt;30 savers |
| Wrong-time | Beta: triage all; prod: no drowning inbox | Same bug reported by many independents |
| Ads / IAP | Prod ads on; IAP purchasable on Android (iOS when shipped) | Still test mode at “launch” |
| iOS | TestFlight or live per plan | “Someday” with no build |

Tim: after first 30 soft-launch users, write **actual** D1/D7 numbers into this table and freeze go/no-go thresholds with Simon.

---

## 5. Weekly ritual (15 min)

**Purpose:** After Play is public, decide each week whether soft-launch health is good enough to **keep going** (stay public / expand / later green-light iOS submit), or to **pause** and fix. Not a full status meeting — five facts, one written verdict.

**Cadence:** Same weekday each week (suggest Monday AWST). Starts first week of Play public (~22 Sep 2026).  
**Owners:** Tim + PM; Ruth when channel metrics matter.  
**Holiday rule:** Tim OOO **27 Sep – 9 Oct** → PM runs **watch-only** (log the five checks; no rollout expand; no iOS submit). Full ritual resumes with Tim from **13 Oct**.

1. Installs + Journey saves this week  
2. D7 for cohort that saved 7+ days ago  
3. Top 3 bugs from beta/friends  
4. AdMob not in test mode? IAP still buys? **AdMob:** production web `admobTestMode: false`; Play release build forces test mode off (verify one prod ad request in log / AdMob console).  
5. One line in a running log: **go** / **lean-go** / **no-go** instinct  

**Verdicts:** **go** = continue plan · **lean-go** = OK but watch a named risk · **no-go** = pause expansion / open a fix train.

Full holiday blackout + freeze checklist: [launch-program.md](launch-program.md).

---

## Change log

| Date | Note |
|------|------|
| 2026-08-09 | Measurement draft for Ruth Do-now |
| 2026-08-11 | Ritual clarified; Tim OOO watch-only rule added |
