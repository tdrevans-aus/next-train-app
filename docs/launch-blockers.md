# Launch blockers — Play before Tim holiday (27 Sep)

**Bull target:** Play public **~18 Sep**, staged rollout **100% by 26 Sep**, Tim OOO **27 Sep – 9 Oct**.  
**Program:** [launch-program.md](launch-program.md) · Gantt canvas `store-launch-gantt`  
**Rule:** Slip date before shipping red. Fix in priority order.

**Last ranked:** 11 Aug 2026 (~11:40 — LB-01 code done)

---

## P0 — block closed testing / Play submit

| ID | Item | Owner | Status | Evidence / action |
| --- | --- | --- | --- | --- |
| LB-01 | Security ship gate (XSS, AdMob prod gate, privacy copy, API harden, Android backup, IAP accept) | Jim | **DONE (code)** | S-01→S-06 landed 11 Aug. Tim still: Vercel deploy; verify release AAB gets prod ads |
| LB-02 | Widget trust on device (stuck Updating / tap / post-departure stale) | Tim device (+ Jim if red) | **Needs device sign-off** | TESTING.md **22** on rebuild / closed AAB |
| LB-03 | Leave reminders fire on real device | Tim device | **Needs device sign-off** | TESTING.md **17–19** |
| LB-04 | Prod AdMob + IAP path | Tim | **Jim gate done; Tim console** | Create IAP product; confirm prod ad on **release** AAB |
| LB-05 | Privacy HTTPS + contact email + accurate privacy/About | Tim | **Copy done; deploy** | Email in About/Privacy. Deploy Vercel → `https://next-train-app.vercel.app/privacy.html` in Play |
| LB-06 | Signed AAB + Play closed track + Data safety | Tim | **Tim** | [aab-signing-closed-testing.md](aab-signing-closed-testing.md) · [play-data-safety-cheatsheet.md](play-data-safety-cheatsheet.md) |

## P1 — block public / Ruth-Dwayne sign-off confidence

| ID | Item | Owner | Status | Evidence / action |
| --- | --- | --- | --- | --- |
| LB-07 | Delete last journey empty-state regression | Jim | **PASS (11 Aug retest)** | `node qa/delete-last-journey.mjs` |
| LB-08 | Full web regression green | Jim / QA | **Re-run after S-batch** | Quick `qa/` pass before closed AAB |
| LB-09 | Dwayne lean security review + sign-off | Dwayne | **Brief ready** | [dwayne-brief-security-signoff.md](dwayne-brief-security-signoff.md) — vs closed build |
| LB-10 | Ruth Play listing + creative sign-off | Ruth + Simon | **Briefs out** | Ruth + [simon-brief-play-creative.md](simon-brief-play-creative.md) |

## P2 — should before holiday; can slip past soft launch if needed

| ID | Item | Owner | Notes |
| --- | --- | --- | --- |
| LB-11 | Min analytics (5 events) | Jim | SHOULD — after Tim device feedback |
| LB-12 | CI smoke on main | PM / Jim | SHOULD |
| LB-13 | Commute strip notification | Jim | Unblocked when Tim clears or parks LB-02/03 |
| LB-14 | iOS scaffold start | PM | Parallel from ~8 Sep |

---

## Right now (post LB-01)

### Tim (critical path)
1. **Deploy Vercel** so privacy/About HTTPS match S-02 (**LB-05**).
2. Play Console: Data safety + privacy URL + IAP + closed track (**LB-06** / **LB-04**).
3. `npm run cap:sync` → signed closed AAB ([aab-signing-closed-testing.md](aab-signing-closed-testing.md)); include template-wizard z-index fix if still local-only.
4. Device: widget **22** + reminders **17–19** (**LB-02**, **LB-03**).
5. Send Dwayne brief if not sent.

### Jim
- Stand by for device fails on widget/reminders.
- Optional: full `qa/` regression after S-batch.
- P2 commute-strip only when Tim parks or clears LB-02/03.

### PM
- Board updated; checklists ready.
- Next on request: Jon packet / CI sketch.

---

## Explicitly not on the bull path

- City #2, paid UA, press send, wide QR  
- iOS App Store submit (post-holiday; TF can start 26 Sep)  
- Full pen test / UMP / tablet layouts  

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | First ranked backlog; bull target Play before Tim OOO; delete-last retested PASS |
| 2026-08-11 | **LB-01 code DONE** (S-01→S-06); Tim path = deploy + console + closed AAB + device |
