# Next Train — Store Launch Program

**Program manager:** Cursor agent (PC) / Ros  
**Anchor date:** 11 Aug 2026  
**Tim holiday (OOO):** **27 Sep – 9 Oct 2026** (returns **10 Oct**)  
**Store targets:** Play public ~18 Sep 2026 · App Store submit ~24 Oct 2026 · both live ~7 Nov 2026  
**Revenue north-star (program expansion):** **A$20,000 / year net profit** (after opex) — see [revenue-program-20k.md](revenue-program-20k.md)  
**Visual plan:** [store-launch-plan canvas](/Users/tdrev/.cursor/projects/c-Users-tdrev-Next-Train-App/canvases/store-launch-plan.canvas.tsx)

**Related:** [store-listing.md](store-listing.md) · [pre-launch-do-now.md](pre-launch-do-now.md) · [go-no-go-metrics.md](go-no-go-metrics.md) · [business-marketing-plan.md](business-marketing-plan.md) · [ruth-brief-marketing-launch.md](ruth-brief-marketing-launch.md)

---

## Objectives

| ID | Objective |
| --- | --- |
| **O1** | Live on **Play + App Store** with quality gates (Tim + Dwayne + Ruth) |
| **O2** | **A$20k / year net profit** (after store fees **and** opex) |
| **O3** | Opex controlled; founder salary separate |
| **O4** | Expand city #2+ only after Perth go/no-go + monetization proof |

O1 is the store-launch critical path. O2–O4 are the **revenue program** ([revenue-program-20k.md](revenue-program-20k.md)): monetisation, marketing budget, expansion, financial model.

---

## Scope

One program to get Next Train live on **Play Store** and **App Store**, with two sub-projects:

| Sub-project | Lead | In scope |
| --- | --- | --- |
| **Product / release** | PM (+ Tim product go/no-go) | Quality gates, blockers, builds, consoles/signing, beta health, binary submit |
| **Marketing / communications** | **Ruth** | ASO, creative (with Simon), demo, QR, beta invite copy, press hold, channel plan |

**Ship gates (each platform public release):** Tim go + **Dwayne** security sign-off + **Ruth** marketing sign-off.

---

## Roles (RACI shorthand)

| Who | Owns |
| --- | --- |
| **Tim** | Product go/no-go, Play + Apple accounts, console clicks, contact email, Must vs Skip |
| **PM** | Program board, gates, Android release readiness, Jim briefs, Jon packets, chase sign-offs |
| **Ruth** | Marketing sub-project; sign-off on all marketing |
| **Dwayne** | Security review; sign-off before each platform ships |
| **Jon** | Mac: Xcode, certs, TestFlight, App Store Connect submit |
| **Jim** | Product fixes; security remediations that are eng-owned |
| **Simon** | Screenshots, feature graphic, demo, QR kit → Ruth |

---

## Schedule assumptions

- Quality over speed: slip a Must gate rather than ship red.
- Closed test needs real weekday commute days (~2 weeks of tester time).
- iOS scaffolds during Android soft launch so Jon is not blocked on Play public.
- **Tim OOO 27 Sep – 9 Oct:** no Tim console / ship decisions; TestFlight continues; App Store submit waits until Tim is back.
- Apple review buffered ~2 weeks; **7 Nov is a target, not a hard Apple commit**.
- Paid UA / wide QR / press send: Ruth prepares; do not fire until go/no-go.

---

## Tim holiday blackout (27 Sep – 9 Oct)

### Before leave (complete by Fri 26 Sep)

| Item | Owner |
| --- | --- |
| Play staged rollout at **100%** (preferred) or explicitly frozen at a % | Tim |
| Prod ads on; IAP buy verified on a real account | Tim |
| Pre-holiday freeze checklist written (see below) | Tim + PM |
| Jon has App Store Connect / signing access; TestFlight tester list seeded | Tim + Jon |
| Standing rule: **P0 production fire only** — who pages Tim and for what | Tim |
| Ruth: no press/QR send while Tim away | Ruth |

**Freeze checklist (Tim signs before OOO):**

1. Play rollout % locked (100% or freeze-at-X — no mid-holiday expands).
2. Support email monitored or auto-reply with “back 10 Oct.”
3. Known issues list current; Jim owns triage while away.
4. Jon authorized for **TestFlight builds only** — not App Store submit.
5. PM authorized for **watch-only** go/no-go (log metrics; no expand / no ship).

### During OOO — allowed vs blocked

| Allowed | Blocked until Tim returns (10 Oct) |
| --- | --- |
| Jon: iOS builds + TestFlight | App Store submit |
| Jim: TF / Play bug fixes (non-breaking) | Play rollout % changes |
| Ruth: App Store listing **draft** | Ruth external launch comms / press |
| PM: watch-only go/no-go + holiday log | Tim go decisions, ads/IAP console changes |
| Dwayne: can start reading iOS materials | Final Dwayne ship sign-off without Tim in the loop for submit |

### After return (from 10 Oct)

1. Tim reads holiday log + TestFlight status (~half day).
2. Tim + Jon decide TF ready enough for Dwayne final pass.
3. Dwayne iOS sign-off + Ruth ASC marketing sign-off → Tim go → Jon submit (~24 Oct).

---

## Weekly go / no-go ritual

**What it is:** A fixed **15-minute** weekly check after Play is public. Purpose: decide whether soft-launch health is good enough to **keep going** (stay public / expand / later green-light iOS submit and city #2), or to **pause** and fix. It is not a full status meeting.

**When:** Starts **22 Sep** (first week Play is public). Cadence: same weekday each week (suggest Monday AWST).  
**Owners:** Tim + PM; Ruth joins when channel/QR metrics matter; Simon optional for target sanity.  
**During Tim OOO:** PM runs **watch-only** (29 Sep and 6 Oct weeks) — records the five checks, never expands rollout or ships iOS. Full ritual with Tim resumes **13 Oct**.

**The five checks** (from [go-no-go-metrics.md](go-no-go-metrics.md)):

| # | Check | Fail signal |
| --- | --- | --- |
| 1 | Installs + journey saves this week | Saves near zero while installs rise |
| 2 | D7 retention for journey-savers who saved 7+ days ago | Cohort basically ghosts |
| 3 | Top 3 bugs from inbox / friends | Same wrong-time bug from independent reporters |
| 4 | AdMob still prod + IAP still purchasable | Test mode or broken buy |
| 5 | One-line verdict: **go** / **lean-go** / **no-go** | Written in a running log — don’t debate forever |

**Verdict meanings:**

- **go** — healthy; continue plan (rollout / TF / toward submit).
- **lean-go** — ship path OK but watch a specific risk; no new expansion until cleared.
- **no-go** — pause expansion; open a fix train; do not submit iOS.

Numeric bars stay draft until ~7–14 days of soft-launch data ([go-no-go-metrics.md](go-no-go-metrics.md) §4).

---

## Milestones

| ID | Milestone | Date | Owner |
| --- | --- | --- | --- |
| M1 | Phase 0 exit (stabilize) | **22 Aug 2026** | Tim |
| M2 | Closed test complete | **12 Sep 2026** | Tim |
| M3 | Play public live (staged start) | **18 Sep 2026** | Tim |
| — | Tim holiday starts | **27 Sep 2026** | Tim |
| M4 | TestFlight start | **26 Sep 2026** | Jon |
| — | Tim returns | **10 Oct 2026** | Tim |
| M5 | App Store submit | **24 Oct 2026** | Jon |
| M6 | Both stores live (target) | **7 Nov 2026** | Tim |

---

## Activity schedule (owner + dates)

### Phase 0 — Stabilize · 11–22 Aug

| Activity | Owner | Start | End |
| --- | --- | --- | --- |
| Program doc + gates locked | PM | 11 Aug | 13 Aug |
| Launch blocker backlog + Jim briefs | PM | 11 Aug | 12 Aug |
| Fix P0/P1 (delete-last-journey, widget trust) | Jim | 12 Aug | 22 Aug |
| Privacy HTTPS, contact email, privacy copy | Tim | 11 Aug | 20 Aug |
| Release vs test AdMob strategy | PM | 13 Aug | 15 Aug |
| Marketing sub-project standup | Ruth | 12 Aug | 15 Aug |
| Dwayne brief + lean checklist | Dwayne | 13 Aug | 19 Aug |
| CI smoke + analytics decision | PM | 18 Aug | 22 Aug |

### Phase 1 — Android soft launch · 18 Aug – 15 Sep

| Activity | Owner | Start | End |
| --- | --- | --- | --- |
| Play Console: listing draft, Data safety, IAP, closed track | Tim | 18 Aug | 29 Aug |
| AAB / signing + first closed build | PM | 25 Aug | 28 Aug |
| Beta invite messaging | Ruth | 11 Aug | 11 Aug (done — Tim sends ~25–28 Aug) |
| Closed testing (5–15 friends) | Testers | 28 Aug | 11 Sep |
| Device matrix + leave-reminder sign-off | Tim | 28 Aug | 11 Sep |
| Beta bugfix | Jim | 28 Aug | 12 Sep |
| Min analytics instrumentation | Jim | 25 Aug | 5 Sep |
| Dwayne Android security review | Dwayne | 8 Sep | 12 Sep |
| Remediate security findings | Jim | 10 Sep | 15 Sep |

### Phase 2 — Play public · 8 Sep – ongoing (Tim OOO mid-stream)

| Activity | Owner | Start | End |
| --- | --- | --- | --- |
| Prod screenshots + feature graphic | Simon | 8 Sep | 15 Sep |
| Ruth Play marketing sign-off | Ruth | 15 Sep | 17 Sep |
| Dwayne Android ship sign-off | Dwayne | 15 Sep | 17 Sep |
| Tim go + prod ads / IAP confirm | Tim | 17 Sep | 18 Sep |
| Play staged rollout → 100% before leave | Tim | 18 Sep | 26 Sep |
| Tim pre-holiday freeze checklist | Tim | 24 Sep | 26 Sep |
| **Tim holiday — no console / ship decisions** | Tim | **27 Sep** | **9 Oct** |
| Go/no-go ritual (with Tim) | PM | 22 Sep | 26 Sep |
| Go/no-go watch-only (PM, no expand) | PM | 29 Sep | 9 Oct |
| Go/no-go ritual resumes (with Tim) | PM | 13 Oct | ongoing |

### Phase 3 — iOS · 8 Sep – 7 Nov

| Activity | Owner | Start | End |
| --- | --- | --- | --- |
| Capacitor iOS scaffold + parity table | PM | 8 Sep | 19 Sep |
| Jon handoff packet | PM | 15 Sep | 19 Sep |
| Xcode signing + App Store Connect | Jon | 22 Sep | 26 Sep |
| iOS build + TestFlight (runs through Tim OOO) | Jon | 26 Sep | 17 Oct |
| TestFlight bugfix | Jim | 29 Sep | 17 Oct |
| App Store listing draft | Ruth | 6 Oct | 17 Oct |
| Tim return: TF review + ASC go prep | Tim | 10 Oct | 17 Oct |
| Dwayne iOS security review + sign-off | Dwayne | 13 Oct | 20 Oct |
| Ruth App Store marketing sign-off | Ruth | 15 Oct | 20 Oct |
| Tim go + Jon App Store submit | Jon | 20 Oct | 24 Oct |
| Apple review buffer → live | Tim | 24 Oct | 7 Nov |

---

## Must / Should / Skip (summary)

See full detail in the approved plan. Ship blockers include: no P0/P1 on commute paths; prod ads + IAP; legal/store hygiene; signed release; closed beta smoke; crash sanity; **Dwayne sign-off**; **Ruth marketing sign-off**.

**Skip for v1 (aware):** full UMP/EU consent; paid UA until go/no-go; City #2 eng; automated widget UI tests; tablet layouts; full WCAG; third-party pen test/SOC2 (does not replace Dwayne); iOS widget day-one.

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | Program of record created with dated schedule + Gantt canvas |
| 2026-08-11 | Tim OOO 27 Sep–9 Oct planned in; App Store submit → 24 Oct; both-live target → 7 Nov; go/no-go ritual documented |
| 2026-08-11 | Bull run: Play before holiday locked; blockers ranked in [launch-blockers.md](launch-blockers.md) |
| 2026-08-11 | Ruth marketing brief: [ruth-brief-marketing-launch.md](ruth-brief-marketing-launch.md); support email EvansAppStudio@gmail.com |
| 2026-08-11 | Parallel briefs: [simon-brief-play-creative.md](simon-brief-play-creative.md), [dwayne-brief-security-signoff.md](dwayne-brief-security-signoff.md), [play-data-safety-cheatsheet.md](play-data-safety-cheatsheet.md) |
| 2026-08-11 | Closed-testing AAB/signing: [aab-signing-closed-testing.md](aab-signing-closed-testing.md) |
