# Next Train — Revenue program (A$20k / year)

**Program expansion (Ros / Tim):** Store launch remains necessary; it is no longer sufficient.  
**North-star objective:** Earn **A$20,000 per year net profit** from Next Train (**after** store fees **and** cash opex, **before** founder salary).  
**Related:** [business-marketing-plan.md](business-marketing-plan.md) · [launch-program.md](launch-program.md) · [go-no-go-metrics.md](go-no-go-metrics.md)

**Status:** Planning draft — 11 Aug 2026. Refine with real AdMob ARPDAU + IAP conversion after closed/public soft launch.

---

## 0. Expanded program objectives

| # | Objective | Measure |
| --- | --- | --- |
| **O1** | Live on Play + App Store (quality gates) | Launch program: Dwayne + Ruth + Tim go |
| **O2** | **A$20k / year net profit** | Trailing 12-month: (ads + IAP after store cut) − cash opex ≥ **A$20k** |
| **O3** | Sustainable opex | Opex visible monthly; don’t let spend eat the target unnoticed |
| **O4** | Expand only when earned | City #2 after Perth go/no-go — not before monetization proof |

**Definition of “make A$20k” (locked — Tim 11 Aug 2026):**

- **Target = net profit after opex**  
- **Revenue (monetization):** AdMob (+ web AdSense if material) + remove-ads IAP, **after** Google/Apple store fees  
- **Minus cash opex:** hosting, developer fees, tools, print/QR ops, paid UA, legal buffer draws actually spent  
- **Exclude:** Founder salary, unpaid time, one-off capital (e.g. Mac)

**Product revenue bar (implies):** monetization after store fees must be **~A$22–25k+** in a mid-opex year (or higher if UA is heavy) to clear **A$20k net**.

| Opex band | Opex | Monetization needed for A$20k net |
| --- | ---: | ---: |
| Lean | ~A$1–2k | ~**A$21–22k** |
| Mid | ~A$4k | ~**A$24k** |
| High (push UA) | ~A$8–12k | ~**A$28–32k** |

---

## 1. Monetisation plan

### 1.1 Model (v1 — locked)

| Stream | Price / rate | Studio keep (planning) | Role |
| --- | --- | --- | --- |
| **Banner ads** | Fill-dependent | ~**A$0.015–0.04 ARPDAU** | Volume; every Journey-saver open |
| **Remove ads IAP** | **A$3.99** one-time | ~**A$2.80–3.40** (use **A$3.00** blended) | High-intent payers; no subscription guilt |
| **Subscriptions** | — | — | **Out for v1** |
| **City packs / B2B** | — | — | Later only if numbers force it |

### 1.2 Paths to ~A$20k **net** (illustrative)

Use **A$3.00** net per IAP and **A$0.025** mid ARPDAU. Assume **mid opex ~A$4k** → need ~**A$24k monetization** after store fees.

| Path | Rough mix (monetization) | What it implies |
| --- | --- | --- |
| **A — Ads-heavy** | ~A$18k ads + ~A$6k IAP | ~**2,000 DAU** avg; ~**2,000** IAP / year |
| **B — Balanced (preferred)** | ~A$12k ads + ~A$12k IAP | ~**1,300 DAU**; ~**4,000** IAP / year |
| **C — IAP-heavy** | ~A$6k ads + ~A$18k IAP | Fewer opens OK; ~**6,000** IAP / year |

Lean opex (~A$2k) lowers the bar to ~A$22k monetization; push UA raises it.

**Perth-only Year 1 reality check:** Hitting A$20k **net** in calendar Year 1 is stretch. Treat as **Year-2 run-rate** unless city #2 and iOS land early and convert hard.

### 1.3 Levers (product)

1. Keep **leave-by / Journey** stickiness (opens → ads).  
2. Honest, visible **Remove ads** (Menu) after value is felt — not day-0 hard wall.  
3. Both stores live (iOS expands payer + ad pool).  
4. Widget / reminders (Android) → more opens without killing trust.  
5. **Do not** add subscription until A$20k path is proven or clearly blocked.

### 1.4 Measurement

| Metric | Where |
| --- | --- |
| AdMob estimated earnings / ARPDAU | AdMob + Play |
| IAP count × net | Play / ASC + `adfree_purchase_success` |
| MAU / DAU | Analytics (still to instrument) |
| Monthly P&L | Simple sheet (this model §4) |

---

## 2. Marketing budget / plan (toward A$20k)

### 2.1 Posture

| Phase | Spend | Goal |
| --- | --- | --- |
| **Pre-public / closed** | **A$0** paid UA | Opt-ins, listing, creative (Ruth/Simon time) |
| **Soft launch (first 30–60 days public)** | **A$0–500** | Print QR test (5–10 venues); organic only |
| **After go/no-go green** | **A$1–3k** first paid UA test | Only if LTV ≳ 1.5× CPI |
| **City #2 launch** | **A$1–2k** local burst | Copy Perth playbook |
| **Steady state (Year 2)** | Cap paid UA so total marketing ≤ **~25% of trailing revenue** until A$20k hit |

**Rule (from business plan):** No scale UA until LTV clearly beats CPI.

### 2.2 Annual marketing budget bands (AUD)

| Band | Year 1 (partial year) | Year 2 (full, chasing A$20k) | What it buys |
| --- | --- | --- | --- |
| **Lean** | A$200–800 | A$1–3k | Print, domain, tiny boosts |
| **Base** | A$1–2k | A$3–6k | QR + measured Meta/Google tests |
| **Push** | A$3–5k | A$6–10k | Only if Path B working |

**Ruth owns** channel plan and creative readiness; **Tim owns** cash spend go/no-go; **PM** tracks ROI vs model.

### 2.3 Channel priority (spend order)

1. ASO / listing (Ruth + Simon) — already in flight  
2. Organic: Perth FB / Reddit / friends of closed testers  
3. QR guerrilla (permissioned venues) — measurable `?src=`  
4. PR hold → send after live + go/no-go  
5. Paid UA — last  

Detail: business plan §3; Ruth brief `ruth-brief-marketing-launch.md`.

---

## 3. Expansion plan

### 3.1 Sequence (unchanged logic, revenue-gated)

| Stage | When | Gate |
| --- | --- | --- |
| **Perth Android + iOS live** | Now → ~Nov 2026 | Launch program quality gates |
| **Prove money in Perth** | +30–90 days public | Ads+IAP plumbing; Journey D7; wrong-time not on fire |
| **City-data layer** | Parallel from now (bookmark → thin adapter) | Engineering spare capacity; **not** paid UA for city #2 yet |
| **City #2 ship** | ~months 4–6 after public | Perth go/no-go **and** monetization not obviously dead |
| **Cities #3–4** | Year 2 | City #2 pays for itself on discovery cost |
| **Overseas** | Year 2–3+ | Only with open reliable feeds + English-first |

### 3.2 Why expansion matters for A$20k

Perth SAM is real but finite. **Balanced Path B** is easier with **2+ cities** (more DAU + more IAP) than ads-only Perth. Expansion is a **revenue instrument**, not a vanity roadmap.

### 3.3 What “expand” means product-wise

- City picker + adapter for live departures  
- Local ASO keywords / screenshots (Ruth)  
- Same monetization (ads + A$3.99)  
- No rewrite of leave-by core  

City #2 shortlist homework: `docs/city-2-bookmarks.md` (existing).

---

## 4. Financial model (inc. opex)

### 4.1 Annual opex (cash, AUD) — planning

| Line | Low | Mid | High | Notes |
| --- | --- | --- | --- | --- |
| Hosting / Vercel / monitoring | 200 | 400 | 800 | |
| Play + Apple developer | 150 | 250 | 400 | |
| Tools (analytics, email, design) | 0 | 400 | 1,200 | Firebase/PostHog free tier first |
| Print / QR / misc marketing ops | 100 | 500 | 2,000 | Excludes big UA |
| Paid UA | 0 | 2,000 | 6,000 | Only after proof |
| Legal / compliance **buffer** | 0 | 500 | 2,000 | Contingency, not mandatory spend |
| **Total opex** | **~450** | **~4,050** | **~12,400** | Mid assumes measured UA |

**Not in opex:** founder time, Mac purchase (capital), contractors (default none).

### 4.2 Year-2 target P&L (**A$20k net profit**)

| | Lean opex hit | Mid opex hit | Notes |
| --- | ---: | ---: | --- |
| Ads (after store) | 13,000 | 12,000 | |
| IAP (after store) | 9,000 | 12,000 | @ ~A$3 net |
| **Monetization** | **22,000** | **24,000** | Bar above net target |
| Opex | (2,000) | (4,000) | |
| **Net profit (O2)** | **20,000** | **20,000** | **Locked target** |

### 4.3 Year-1 (FY from soft launch) — expect under A$20k net

| | Pessimistic | Base | Stretch |
| --- | ---: | ---: | ---: |
| Monetization | 1–4k | 6–12k | 15–22k |
| Opex | 1–2k | 2–4k | 4–6k |
| **Net** | ~0–2k | ~3–8k | ~10–16k |

Partial year + Perth-only + learning. **A$20k net is the Year-2 run-rate goal**.

### 4.4 Unit economics (for UA decisions)

| Input | Planning value |
| --- | --- |
| IAP net | A$3.00 |
| ARPDAU | A$0.025 (calibrate live) |
| Journey-saver opens / day | Measure post-launch |
| AU utility CPI | A$2–6 |
| **UA allow** | LTV (90d ads + P(IAP)×A$3) ≥ **1.5 × CPI** |

### 4.5 Monthly ritual (add to go/no-go)

1. AdMob + IAP cash after store fees (MTD / trailing 30d)  
2. Opex cash out (same period)  
3. **Net** annualized: `((monetization_30d − opex_30d) × 12)` vs **A$20k**  
4. One line: on-path / lean / off-path vs O2  

---

## 5. Program structure (how this sits with store launch)

```text
Evans Studios — Next Train
├── Store Launch Program (Ros)     → O1 live both stores
├── Revenue Program (this doc)     → O2 A$20k net + O3 opex + O4 expand gates
│   ├── Monetisation
│   ├── Marketing budget (Ruth executes channels; Tim spends)
│   ├── Expansion (city sequence)
│   └── Financial model / P&L
└── Marketing sub-project (Ruth)   → creative + ASO under both
```

Store launch **unblocks** revenue; it does not achieve A$20k net by itself.

---

## 6. Immediate next actions

| Who | Action |
| --- | --- |
| Tim | **Done:** A$20k = **net profit after opex** (locked) |
| Tim / PM | Stand up a one-page monthly P&L sheet (even a Google Sheet) |
| Ruth | Align channel plan to §2 budget bands (UA spend raises the monetization bar) |
| Jim | Instrument money events (IAP success required) |
| All | Do not spend Path “Push” UA until soft-launch LTV known — UA makes A$20k net harder |

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | Revenue program created; four pillars from business plan |
| 2026-08-11 | **O2 locked:** A$20k = **net profit after opex**; mid path needs ~A$24k monetization |
