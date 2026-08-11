# Jim brief: Security — privacy + About honesty (S-02)

**For:** Jim (implement copy)  
**From:** Simon (design) / Tim (product)  
**Status:** **Done** — shipped in `public/privacy.html` + `public/about.html` (Ruth production pass, 11 Aug 2026)  
**Related:** `docs/simon-brief-security-hardening.md` **S-02**; `public/privacy.html`; `public/about.html`  
**Out of scope:** Lawyer sign-off; inventing new consent UIs; changing when location/ads run  
**Support email (locked):** `EvansAppStudio@gmail.com`

---

## 1. Decision (locked)

**`privacy.html`** matches what the app actually does: on-device location for Near me, AdMob on Android, AdSense on web when configured, Play remove-ads purchase (Apple IAP noted for when iOS ships), localStorage **and** Android prefs (widget / leave reminders), hosting logs including station/direction query paths.

**About:** Aligned — leave-by positioning, Android widget/reminders, AdMob/AdSense, A$3.99 one-time remove-ads, Evans Studios + locked support email + GitHub.

Tim uses the **Play Console Data safety** notes at the bottom when filling the store form (Jim does not submit Console).

**Jim:** Do **not** rewrite these pages unless product behaviour changes. If you touch them, preserve contact email and keep Privacy ↔ About consistent.

---

## 2. Privacy copy (shipped — source of truth is `public/privacy.html`)

Page includes at least the S-02 required sections, plus marketing/store-ready extras:

### Who we are *(extra — shipped)*

Evans Studios; contact `EvansAppStudio@gmail.com`; unofficial / not affiliated with Transperth / PTA.

### Overview

Next Train shows live Perth (Transperth) departure times and leave-by for saved journeys. No account. Prefer keeping personal data on-device.

### Location

- On Android and in browsers that allow it, **Near me** may use your device location (precise or approximate) **only on the device** to pick the nearest Transperth station.  
- We **do not upload GPS coordinates** to our servers.  
- We may send the **station name** (and direction) to our API to fetch live times.  
- You can deny location permission; Near me won’t auto-detect, and you can still pick a station or use Journeys.

### Data stored on your device

- **Web / WebView:** preferences and journeys in **localStorage** (and similar browser storage).  
- **Android app:** additional app preferences for features like the **home-screen widget** and **leave reminders** (Android storage / SharedPreferences), including reminder settings you choose.  
- Leave reminders are **local notifications** on-device — we do not send marketing push from our servers. *(extra — shipped)*  
- This data stays on your device unless you clear app/site data or use **Clear all data** in Menu (purchases are separate — see Purchases).

### Train times

- Live data is fetched from Transperth’s public live-times service **via our API**.  
- Requests include station / direction (not your name or account — we don’t have accounts).  
- Host may log standard request metadata (see Hosting).

### Advertising

- **Android:** Google **AdMob** may show a banner when you’re not ad-free.  
- **Web:** Google **AdSense** may show ads when configured and allowed.  
- Google may use cookies, advertising IDs, or similar technologies per their policies.  
- Links: [Google partner sites policy](https://policies.google.com/technologies/partner-sites) · [Google Privacy Policy](https://policies.google.com/privacy).

### Purchases (Remove ads)

- Optional **one-time** “Remove ads” unlock (**A$3.99**) via **Google Play Billing** in the Android app.  
- When iOS ships: same unlock via **Apple In-App Purchase**.  
- We do **not** receive card number / full payment details — Google or Apple handles payment.  
- Entitlement checked with the store on-device; local cache may remember ad-free offline; **Restore** in Menu after reinstall.

### Hosting & logs

- Website / API hosted on a cloud provider (**Vercel** today).  
- Standard logs may include **IP address**, time, user agent, and **request path/query** (e.g. station and direction). Used for security and operations, not for building a personal profile in-app.

### Children · Changes *(extra — shipped)*

General audience; not directed at under-13. Policy may update; “Last updated” date changes when it does.

### Contact / Disclaimer

Email + About link; Transperth / PTA unofficial disclaimer; times without guarantee.

**Last updated on page:** 11 August 2026.

---

## 3. Acceptance

| Check | Pass |
|-------|------|
| `privacy.html` mentions **location** + on-device nearest station | **Yes** |
| Mentions **AdMob** (Android) and **AdSense** (web) | **Yes** |
| Mentions **Play** one-time purchase / no card details | **Yes** |
| Mentions **widget / reminder** device storage (not only localStorage) | **Yes** |
| Mentions host may log IP + request path | **Yes** |
| Contact email on Privacy + About (`EvansAppStudio@gmail.com`) | **Yes** |
| Menu → Privacy still opens this page | Unchanged (verify if you change routing) |

---

## 4. Play Console Data safety — Tim cheat sheet (do not invent new collection)

| Category | Declare (guidance) |
|----------|-------------------|
| Location | Approx + precise — **App functionality** (Near me). Collected; **not** shared by us as GPS to our backend. |
| App info / device IDs | As required for **AdMob** / Play — follow Google’s declarations for ads. |
| Purchase history | Handled by Google Play; we don’t store card data. |
| Data security | Data encrypted in transit (HTTPS). Users can clear local data in-app. |

Tim: match declarations to AdMob’s current Play questionnaire defaults where ads are enabled.  
Tim still needs: **production HTTPS URL** for Privacy/About in Play listing (copy is ready; domain paste is Console).

---

## Change log

| Date | Note |
|------|------|
| 2026-08-11 | First S-02 Jim brief (copy requirements) |
| 2026-08-11 | **Done** — Ruth shipped production Privacy/About; brief synced to live pages; Jim: no rewrite unless behaviour changes |
