# NT-10 — Apple Developer + App Store Connect + IAP

**Owner:** Tim (browser) · **Engineering:** repo wired for `com.tdrevans.nexttrain.adfree` @ **A$7.99**  
**Bundle id:** `com.tdrevans.nexttrain` (must match `capacitor.config.ts`)

---

## 1. Apple Developer Program (~A$149 / year)

1. Go to [developer.apple.com/account](https://developer.apple.com/account) → **Enroll**.
2. Use the Evans / Tim Apple ID that will own the app.
3. Wait for membership **Active** (often same day; can take 48h).

---

## 2. App Store Connect — app record

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**.
2. **Platforms:** iOS  
3. **Name:** Next Train  
4. **Primary language:** English (Australia)  
5. **Bundle ID:** `com.tdrevans.nexttrain` (create under **Certificates, Identifiers & Profiles → Identifiers** if missing).  
6. **SKU:** `nexttrain-ios` (any unique string).  
7. **User access:** Full access for Tim + whoever uploads (Vijay/Jon).

**Listing URLs (paste when ready):**

| Field | Value |
| ----- | ----- |
| Privacy policy | `https://next-train-app.vercel.app/privacy.html` |
| Support URL | `https://next-train-app.vercel.app/about.html` |
| Support email | `EvansAppStudio@gmail.com` |

---

## 3. In-App Purchase (non-consumable)

1. App Store Connect → **Next Train** → **In-App Purchases** → **+**.
2. Type: **Non-Consumable** (one-time, permanent unlock).
3. **Reference name:** `Ad-free` (internal only).
4. **Product ID:** `com.tdrevans.nexttrain.adfree` — **must match** `public/site-config.json` → `adFreeProductId`.
5. **Price:** **A$7.99** (Australia tier; confirm storefront shows AUD 7.99).
6. **Display name:** Remove ads  
7. **Description:** Remove banner ads forever. One-time purchase; restore on new devices from Menu.
8. **Family Sharing:** optional (either is fine for v1).
9. Save → submit IAP metadata for review **with** the first app version that includes the purchase button.

**Screenshot for IAP review:** capture Menu → Remove ads sheet on device or simulator.

---

## 4. Xcode (after `npm run cap:sync:ios`)

Already in repo:

| Item | Location |
| ---- | -------- |
| Capgo Native Purchases (StoreKit 2) | `ios/App/CapApp-SPM/Package.swift` |
| In-App Purchase capability | App target → Signing & Capabilities |
| StoreKit local config | `ios/App/NextTrainProducts.storekit` |
| Run scheme uses StoreKit file | `App.xcscheme` → StoreKit Configuration |

**On Mac:**

```bash
npm run cap:sync:ios
npx cap open ios
```

1. App target → **Signing & Capabilities** → Team = your paid team → **In-App Purchase** present.
2. **Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration** = `NextTrainProducts.storekit` (for simulator local buys before ASC product is live).
3. Run on simulator or device → **Menu → Remove ads** → Apple purchase sheet.

**Sandbox testing (after IAP exists in ASC):**

1. App Store Connect → **Users and Access → Sandbox → Testers** → add sandbox Apple ID.
2. On iPhone: Settings → App Store → Sandbox Account → sign in.
3. Install via Xcode or TestFlight; purchases are free in sandbox.

---

## 5. App code checklist (done in repo)

- Menu **Remove ads** + purchase sheet (`public/ad-free-purchase.js`)
- Product id + list price from `site-config.json`
- `@capgo/native-purchases` bridge (`public/ad-free-bundle.js`)
- iOS + Android share one product id
- Platform-specific billing error copy (App Store vs Play)

---

## 6. Verification

| Check | How |
| ----- | --- |
| Product id in config | `adFreeProductId` = `com.tdrevans.nexttrain.adfree` |
| List price fallback | `adFreeListPrice` = `A$7.99` |
| iOS preflight | `npm run test:ios:preflight` |
| Web UI | `node qa/remove-ads-check.mjs` |
| Device | Menu → Remove ads → sheet shows **A$7.99** (or store-localized price) → purchase → ads hidden |

---

## 7. TestFlight gate

Upload blocked until:

1. Apple Developer membership active  
2. ASC app record exists  
3. IAP `com.tdrevans.nexttrain.adfree` created (Ready to Submit or approved with app)  
4. NT-6 / widget QA signed off (see Jon status board)

---

## Change log

| Date | Note |
| ---- | ---- |
| 2026-08-18 | NT-10: IAP wiring + ASC runbook @ A$7.99 |
