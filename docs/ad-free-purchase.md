# Design: Remove ads — one-time purchase

**For:** Jim (implement) / Tim (product)  
**Status:** **Shipped (Android IAP)** — web shows “available in the Android app” hint; no fake web checkout  
**Product decision:** **A$7.99 AUD · one-time · forever** — not a subscription  
**Related:** chrome **Menu** (`docs/chrome-modes-and-labels.md`); no Continue ad gate (`docs/remove-ad-continue-gate.md`)

**Menu order as built:** How it works → Add home screen widget → Leave reminders → Remove ads / Restore → About · Privacy → Clear all data.  
Buy subtitle uses store price when loaded (`One-time · …`); entitled copy **You're ad-free**.

---

## 1. Goal

Let users pay once to permanently remove ads on that store account / purchase entitlement, without turning “ad-free” into a fake Pro tier or an annual sub.

**In scope**

- One-time In-App Purchase (IAP): remove ads  
- Purchase + **Restore** flows  
- Hide all ad UI when entitled  
- Copy in Menu, About, and (lightly) near ads  

**Out of scope**

- Subscriptions  
- Family Sharing policy beyond what the store default allows (enable if trivial on the store product)  
- Extra paid features (widgets, themes, etc.)  
- Changing ad *network* setup except gating display on entitlement  

---

## 2. Pricing & product naming

| Item | Value |
|------|--------|
| Price | **A$7.99** (AUD) |
| Model | Non-consumable / lifetime unlock (Play Billing one-time; App Store non-consumable if/when iOS exists) |
| Customer-facing name | **Remove ads** |
| Store product name (suggested) | `Next Train Ad-free` |
| Store product id (suggested) | `ad_free` or `com.tdrevans.nexttrain.adfree` — pick one and keep stable |

**Do not** call it “Pro”, “Premium”, or “Subscription” in UI.

**Why not $2.99 / annual:** product call already made — lifetime at $3.99; annual rejected for ads-only.

Display price via the **store’s localised price string** when available (don’t hardcode “$3.99” only — show store price, with A$3.99 as the configured base). If price hasn’t loaded yet, button can read **Remove ads** until the amount is ready, then **Remove ads · [price]**.

---

## 3. Entitlement behaviour

When `adFree === true` (purchase owned or restored):

1. **Do not** request / show ad consent banner (if not already completed — still fine either way; never show ads).  
2. **Do not** load or render AdMob / AdSense / placeholder banner.  
3. Hide `#ad-container` / ad slot entirely (no empty gap — collapse spacing).  
4. Menu shows purchased state (§5), not a buy CTA as primary.  
5. Persist entitlement locally as cache **and** always re-check with the store on launch / resume (local flag alone is not source of truth).

When `adFree === false`: show ads with **no** “Ads support this app / Continue” gate — see `docs/remove-ad-continue-gate.md`.

**Clear all data:** must **not** wipe store entitlement. Clearing local journey/settings may clear a *cache* flag; on next launch **Restore / silent re-query** must bring ads-free back if the store says owned. Document this in Confirm copy if needed: *“Journeys and preferences only — purchases are kept.”*

---

## 4. Where it appears in the UI

### A. Menu (primary)

Under **Menu** (hamburger), above destructive/legal clutter:

1. **Remove ads** row (if not entitled)  
   - Title: **Remove ads**  
   - Subtitle: **One-time · [store price]** (e.g. One-time · A$3.99)  
   - Tap → purchase flow  
2. **Restore purchase** (always visible for non-entitled; for entitled can remain as quiet text button or hide — prefer **always show Restore** for support)  
3. When entitled: replace buy row with  
   - Title: **Ad-free**  
   - Subtitle: **Unlocked · thank you** (or simply **You’re ad-free**)  
   - Not tappable / or tap shows short “Restored on this device” toast  

Order suggestion in Menu:

- How it works  
- **Remove ads** / Ad-free status  
- **Restore purchase**  
- Clear all data  
- About · Privacy  

### B. Near the ad (secondary, low clutter)

Only when ads are showing (not entitled):

- Very small text under/near the banner slot: **Remove ads** (text button / link style) → same purchase sheet or direct purchase.  
- Do **not** add a large permanent promo card on the main commute/Nearby canvas.

### C. About page

Update Ads section:

- Free app may show a small banner.  
- **Remove ads anytime for a one-time [price]** (or “from Menu”).  
- No “planned for later” once shipped.

### D. Privacy

One line if needed: purchase handled by Google Play / Apple; we don’t receive card numbers. Keep minimal.

---

## 5. Purchase UX

### Happy path

1. User taps **Remove ads**  
2. Native store sheet (Play Billing / StoreKit)  
3. Success → set entitled → hide ads immediately → toast/snackbar: **Ads removed — thank you**  
4. Menu row switches to Ad-free status  

### Failures

| Case | UI |
|------|-----|
| User cancels | Silent return — no error toast |
| Network / store error | Short toast: **Couldn’t complete purchase. Try again.** |
| Already owned | Treat as success — entitle + **You’re already ad-free** |
| Price unavailable | Disable buy or allow tap that then errors gently; prefer wait for product query |

### Restore

1. Tap **Restore purchase**  
2. Query store for ownership of `ad_free`  
3. If owned → entitle + hide ads + **Purchase restored**  
4. If not → **No purchase found for this account**  

No login inside Next Train — store account only.

---

## 6. Platforms

| Surface | Expectation |
|---------|-------------|
| **Android (Capacitor)** | Primary — Google Play Billing non-consumable / one-time product |
| **Web** | No Google IAP. Options: (a) hide Remove ads on web; (b) “Ad-free is available in the Android app”; (c) later Stripe — **out of scope**. Prefer **(a) or (b)** so web doesn’t promise a broken buy button. |
| **iOS** | When shipped: same product semantics; same UI |

Web ad-free: if someone only uses web, they keep ads unless you later add web payments — state that honestly in About if Menu is shared.

---

## 7. Copy bank (final-ish)

| Place | Copy |
|-------|------|
| Menu buy title | Remove ads |
| Menu buy subtitle | One-time · [price] |
| Menu entitled | Ad-free / You’re ad-free |
| Restore | Restore purchase |
| Success | Ads removed — thank you |
| Restored | Purchase restored |
| None found | No purchase found for this account |
| Near ad link | Remove ads |
| About | The free app may show a small banner. Remove ads forever with a one-time purchase from Menu. |

---

## 8. Analytics / ops (lightweight)

If you already log events, useful:

- `adfree_paywall_tap`  
- `adfree_purchase_success` / `cancel` / `error`  
- `adfree_restore_success` / `none`  

No PII. Optional for v1.

---

## 9. Acceptance criteria

1. Store product configured at **A$3.99** one-time; UI shows store price string when loaded.  
2. Successful purchase or restore → **no consent banner, no ad slot, no placeholder** for that user.  
3. Menu has Remove ads + Restore; entitled state replaces buy CTA.  
4. Clear all data does **not** permanently destroy entitlement (re-check/restore brings it back).  
5. Cancelled sheet does not show an error.  
6. Web does not offer a dead IAP button (hide or “available on Android”).  
7. Naming is **Remove ads** / **Ad-free**, not Pro/subscription.  
8. About copy updated; no “planned later.”  

---

## 10. Summary for Jim

> Ship a **one-time A$3.99 “Remove ads”** unlock via Play Billing. Gate all ads on entitlement. Put buy + restore in **Menu**, tiny link near the banner, restore always available. Web: don’t fake IAP. No subscription.

---

## 11. Risk accept (v1)

**Accepted for v1 — no server-side receipt verification:**

- Entitlement comes from **Google Play Billing** on the device, plus a **localStorage** cache (`nextTrainAdFreeCache`).
- Someone who spoofs the local cache may hide ads until the next successful Play re-query says otherwise.
- That is normal for offline-capable one-time IAP without a backend.
- **Do not** add server receipt verify unless Tim reopens it later.
- Launch and resume still call **`refreshEntitlement`** when billing is available — store wins over cache when queried.
