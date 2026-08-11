# Dwayne brief — Security sign-off (Store Launch)

**For:** Dwayne (Cybersecurity)  
**From:** Tim · Program manager  
**Date:** 11 Aug 2026  
**Ask:** Lean security review + **written sign-off before Play public** (~mid-Sep) and again before **App Store submit** (~late Oct)  
**Not asking for:** Full pen test, SOC2, or multi-week engagement

---

## Product (one paragraph)

**Next Train** — unofficial Perth Transperth leave-by companion. Capacitor Android + static web on **Vercel** (`https://next-train-app.vercel.app`). No user accounts. Journeys/prefs on-device. Near me uses device location locally. Live times via our `/api/*` → Transperth. Android: home-screen widget, local leave reminders, AdMob banner, one-time Play Billing remove-ads (A$3.99). iOS later via Jon.

**Support:** EvansAppStudio@gmail.com  
**Privacy (after deploy):** `https://next-train-app.vercel.app/privacy.html`

---

## What we need from you

1. **Agree a lean checklist** (below is our draft — edit freely).  
2. **Review** against a **Play closed-test / release-candidate build** (~8–12 Sep window).  
3. **Written sign-off** (email/Slack is fine) before Tim flips Play public (~15–17 Sep).  
4. Repeat for **iOS** before App Store submit (after Tim returns from holiday 10 Oct; target review ~13–20 Oct).

Tim holiday **27 Sep – 9 Oct** — please don’t schedule must-have Tim meetings in that window.

---

## Draft lean checklist (your call to trim/add)

| Area | What to look at |
| --- | --- |
| **Permissions** | Location, notifications, exact alarm, foreground service — justified vs UX |
| **Data at rest** | Journeys/prefs local only; backup rules; no secrets in repo |
| **Network** | HTTPS API; what query params/logs expose; rate limit / abuse (Jim S-03) |
| **WebView / XSS** | Jim S-01 hardening — sinks, `innerHTML`, external links |
| **Deep links** | `nexttrain://` allowlist only |
| **Ads / IAP** | Test vs prod AdMob gate; Play Billing; no card data to us |
| **Privacy claims** | `privacy.html` / About / Play Data safety match actual behavior |
| **Release hygiene** | Signing, debuggable off, no test keys in prod |

**Out of scope for v1 (Tim aware):** UMP/EU consent SDK, server-side IAP receipt verify, CORS origin lockdown, full third-party pen test.

Engineering trail: `docs/simon-brief-security-hardening.md` + `docs/jim-brief-security-*.md`.

---

## Access we’ll provide

- Repo access (or zip) + this brief  
- Closed-test APK / Play internal link when ready  
- Privacy/About URLs on Vercel  
- PM available for questions; Jim for remediations

---

## Sign-off line (copy when happy)

> I have completed a lean security review of Next Train (Android / Play RC) against the agreed checklist. Findings are closed or accepted. **Signed off for Play public release.** — Dwayne, \<date\>

(iOS variant later.)

---

## Slack-ready (Tim → Dwayne)

> Dwayne — need your lean security sign-off before Next Train goes public on Play (~mid-Sep). Brief: `docs/dwayne-brief-security-signoff.md`. Not a full pen test — checklist + closed-test build review. Can you confirm the checklist and a review window in the 8–17 Sep band?
