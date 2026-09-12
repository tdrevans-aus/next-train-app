# Launch blockers — Play before Tim holiday (27 Sep)

> **Superseded (12 Sep 2026).** Item states below were last ranked **11 Aug 2026** against closed Alpha **2.1.0**; the app is now **3.0.0 / versionCode 24** with 33 live cities, and most P0 rows are long done. The current picture — what's merged, what's blocked, and what only Tim can do — is the **Next Train Launch Board** artifact and `docs/release-notes-3.0.0.md`. Rows still genuinely open as of 12 Sep: **LB-09** (Dwayne security sign-off), **LB-10** (Ruth Play listing), **LB-02/LB-03** (device sign-off on Tim's phone). Treat everything else here as history.

**Bull target:** Play public **~18 Sep**, staged rollout **100% by 26 Sep**, Tim OOO **27 Sep – 9 Oct**.  
**Program:** [launch-program.md](launch-program.md) · Gantt canvas `store-launch-gantt`  
**Rule:** Slip date before shipping red. Fix in priority order.

**Last ranked:** 11 Aug 2026 (~16:30)

---

## P0 — block closed testing / Play submit

| ID | Item | Owner | Status | Evidence / action |
| --- | --- | --- | --- | --- |
| LB-01 | Security ship gate (S-01→S-06) | Jim | **DONE** | Code landed 11 Aug |
| LB-05 | Privacy HTTPS + contact + About | Tim / deploy | **DONE** | Live privacy + about on Vercel |
| LB-04 | Prod AdMob + IAP path | Tim | **Console done** | Confirm on opted-in closed install when live |
| LB-15 | Drop dead FGS `DATA_SYNC` | Jim | **DONE** | Confirmed gone in closed Alpha 2.1.0 AAB (Tim 11 Aug) |
| LB-06 | Signed AAB + closed track + Data safety | Tim | **In review** | Closed Alpha **2.1.0** submitted; **13** on email list; waiting Google |
| LB-02 | Widget trust on device | Tim device | **Needs sign-off** | TESTING.md **22** — after install from Play |
| LB-03 | Leave reminders on device | Tim device | **Needs sign-off** | TESTING.md **17–19** |

**Dead-code list (v2 cleanup):** `docs/dead-code-inventory.md` — only **D-01** (FGS) was in scope for this AAB; rest wait.

## P1 — block public (not closed testing)

| ID | Item | Owner | Status | Evidence / action |
| --- | --- | --- | --- | --- |
| LB-07 | Delete last journey | Jim | **PASS** | qa script |
| LB-08 | Web regression after S-batch | Jim / QA | Optional | |
| LB-09 | Dwayne security sign-off | Dwayne | Brief ready | Before **public** |
| LB-10 | Ruth Play listing + creative sign-off | Ruth + Simon | Waiting Ruth | Before **public** |
| LB-16 | Play hygiene (native symbols + pre-upload) | Jim | **DONE** | **FB-41** — `debugSymbolLevel 'SYMBOL_TABLE'`, `npm run release:prep`, extended `test:pre-upload` |

## P2 — park / parallel

| ID | Item | Owner | Notes |
| --- | --- | --- | --- |
| LB-11–13 | Analytics, CI, commute strip | Jim / PM | Ops: `docs/go-live-ops.md`; crash brief; strip non-FGS |
| LB-14 | iOS / Jon | Tim ASC + Jon Mac | **ASC gated ~days** — Apple fee after closed-test first reactions (target: this weekend if OK). [jon-handoff-ios.md](jon-handoff-ios.md) |

---

## Critical path right now (12 Aug)

```text
Google reviews closed Alpha 2.1.0 (if still pending) / release available
    → Opt-ins + downloads
    → First reactions by weekend
    → If not dumpster fire: Apple Developer fee + ASC shell + IAP
    → Device smoke — `docs/DEVICE-SMOKE.md` (checks 7–9, 11–12, LB-02/LB-03)
Ruth ──► public only
Jon / Mac ──► still waiting on Mac access
```

**Managed publishing is OFF** — when review passes, the closed release goes live to the track automatically (testers still must opt in).

**Testers:** Email list ≠ opted-in. After review: share opt-in link; they join + install from Play.

**ASC:** Not a long defer — green light after this weekend’s closed-test reactions. Bars: `docs/closed-test-feedback-asc-gate.md`.

**Do now (not blocked on Google):** Tim Console check + blast when live · Tim venue list · Simon feature graphic concept · Dwayne calendar hold · Day-2 feedback sheet ready.

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | First ranked backlog |
| 2026-08-11 | LB-01 / LB-05 DONE |
| 2026-08-11 | Closed AAB error → Jim fix → **2.1.0 in review**; Console done; 13 on list |
| 2026-08-11 | **LB-15 DONE** — dead FGS DATA_SYNC confirmed gone in this AAB |
| 2026-08-12 | ASC / Apple Developer fee: **short hold** — green light after closed-test first reactions (~this weekend), not a long defer |
