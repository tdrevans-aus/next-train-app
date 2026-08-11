# Launch blockers — Play before Tim holiday (27 Sep)

**Bull target:** Play public **~18 Sep**, staged rollout **100% by 26 Sep**, Tim OOO **27 Sep – 9 Oct**.  
**Program:** [launch-program.md](launch-program.md) · Gantt canvas `store-launch-gantt`  
**Rule:** Slip date before shipping red. Fix in priority order.

**Last ranked:** 11 Aug 2026 (~13:36)

---

## P0 — block closed testing / Play submit

| ID | Item | Owner | Status | Evidence / action |
| --- | --- | --- | --- | --- |
| LB-01 | Security ship gate (S-01→S-06) | Jim | **DONE** | Code landed 11 Aug |
| LB-05 | Privacy HTTPS + contact + About | Tim / deploy | **DONE** | Live: [privacy](https://next-train-app.vercel.app/privacy.html) · [about](https://next-train-app.vercel.app/about.html) — email + AdMob/location copy match |
| LB-04 | Prod AdMob + IAP path | Tim | **Console** | Create IAP `com.tdrevans.nexttrain.adfree` @ A$3.99; confirm prod ads on **release** AAB |
| LB-06 | Signed AAB + closed track + Data safety | Tim | **In progress** | Finish Play Console leftovers + [aab-signing-closed-testing.md](aab-signing-closed-testing.md) |
| LB-02 | Widget trust on device | Tim device | **Needs sign-off** | TESTING.md **22** |
| LB-03 | Leave reminders on device | Tim device | **Needs sign-off** | TESTING.md **17–19** |

## P1 — block public (not closed testing)

| ID | Item | Owner | Status | Evidence / action |
| --- | --- | --- | --- | --- |
| LB-07 | Delete last journey | Jim | **PASS** | qa script |
| LB-08 | Web regression after S-batch | Jim / QA | Optional before closed | |
| LB-09 | Dwayne security sign-off | Dwayne | Brief ready | Before **public**, not before closed |
| LB-10 | Ruth Play listing + creative sign-off | Ruth + Simon | **Waiting Ruth** | Needed for **public**; closed testing can proceed with draft listing |

## P2 — park

| ID | Item | Owner | Notes |
| --- | --- | --- | --- |
| LB-11–14 | Analytics, CI, commute strip, iOS scaffold | various | After closed build is up |

---

## Critical path right now (11 Aug afternoon)

```text
You (Play Console finish) ──► Closed AAB upload ──► Device smoke (22 + 17–19)
         │
         └── Ruth (listing/creative) ──► only blocks PUBLIC, not closed test
```

**Do not wait on Ruth** to finish closed testing setup.

### Tim — finish Play Console (the “2 steps” list)

Paste these URLs where Play asks:

- Privacy: `https://next-train-app.vercel.app/privacy.html`
- About / contact site: `https://next-train-app.vercel.app/about.html`
- Support email: `EvansAppStudio@gmail.com`

Then tick:

1. **Store listing (draft OK for closed)** — title Next Train; short desc from `store-listing.md`; full description; “unofficial”; no login  
2. **Privacy policy URL** — paste above  
3. **Data safety** — [play-data-safety-cheatsheet.md](play-data-safety-cheatsheet.md) (location, ads, no account)  
4. **IAP** — product id `com.tdrevans.nexttrain.adfree`, one-time **A$3.99**, activate for closed testers / license testers  
5. **Closed testing track** — create release, upload signed AAB, add tester emails, copy opt-in link  
6. **App access** — no login required  
7. **Ads declaration** — yes, AdMob  

**Ruth is for:** final listing polish + screenshots/feature graphic sign-off before **public** (~mid-Sep). Not a gate for closed AAB.

### After Console
1. `npm run cap:sync` → signed AAB → upload closed ([aab-signing-closed-testing.md](aab-signing-closed-testing.md))  
2. Device: widget **22** + reminders **17–19**  
3. Ping Dwayne when closed build exists  

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | First ranked backlog |
| 2026-08-11 | LB-01 code DONE |
| 2026-08-11 | **LB-05 DONE** — Vercel privacy/About live with new copy; critical path = Console finish → closed AAB → device |
