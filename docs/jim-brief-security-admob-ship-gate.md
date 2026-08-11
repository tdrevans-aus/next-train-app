# Jim brief: Security — AdMob ship gate (S-06)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P0 ship gate**  
**Related:** `docs/simon-brief-security-hardening.md` **S-06**; `public/site-config.json`; `public/ads.js` / `ads-native.mjs`; README; `docs/go-no-go-metrics.md`  
**Out of scope:** Changing AdMob unit IDs; redesigning ad UI; iOS

---

## 1. Decision (locked)

| Surface | Rule |
|---------|------|
| Day-to-day debug / repo default | `admobTestMode: true` in `site-config.json` is **OK** (avoids accidental prod ad clicks in dev) |
| **Android release** (non-debug) | Must serve **production** ads — **force test mode off** even if JSON says `true` |
| **Production web deploy** | Tim sets `admobTestMode: false` before/at prod deploy (checklist) |
| Local web / debug APK | May keep test mode on |

Do **not** ship a Play production build that initializes AdMob with `initializeForTesting: true` or Google test banner IDs.

---

## 2. Implementation (preferred)

### 2.1 Effective test-mode helper

In ads init path (`ads.js` / native bridge):

```text
effectiveTestMode = siteConfig.admobTestMode === true
  AND NOT (native && release/non-debug build)
```

How to know release on device (pick one clean approach):

- Expose a tiny Capacitor/Android flag e.g. `BuildConfig.DEBUG` via existing bridge or `Application` → JS (`NextTrainAdsNative.isDebugBuild()`), **or**  
- Inject `admobTestMode: false` at `cap:sync` / Gradle resource merge for **release** builds only.

Debug APK / emulator: keep JSON test mode behaviour.

### 2.2 Checklist (process)

Add one line to a ship-facing doc Tim already uses (prefer `docs/go-no-go-metrics.md` weekly ritual **and/or** `docs/pre-launch-do-now.md` Console row):

> **AdMob:** production web `admobTestMode: false`; Play release build forces test mode off (verify one prod ad request in log / AdMob console).

README already says flip the flag — keep that; Android force is the safety net.

### 2.3 Do not

- Commit `admobTestMode: false` to the main repo JSON as the permanent default unless Tim asks (debug friction).  
- Leave release builds dependent on Tim remembering the JSON flip alone.

---

## 3. Acceptance

| Check | Pass |
|-------|------|
| Debug install + `admobTestMode: true` | Test ads / testing init |
| Release build (or simulated `DEBUG=false`) + JSON `true` | **Production** banner ID / `isTesting: false` |
| Checklist line exists for Tim’s ship ritual | Yes |
| Remove-ads / entitlement gating | Unchanged |

---

## 4. Tim (process, not Jim)

Before Play **production** track / prod web: confirm AdMob console shows real traffic, not only test devices; IAP still purchases.
