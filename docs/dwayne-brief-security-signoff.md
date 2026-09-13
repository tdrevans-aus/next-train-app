# Dwayne brief — Security sign-off (Store Launch)

**For:** Dwayne (Cybersecurity)  
**From:** Tim · Program manager  
**Date:** 11 Aug 2026 (updated evening — closed Alpha 2.1.0 in Play review)  
**Ask:** Lean security review + **written sign-off before Play public** (~mid-Sep) and again before **App Store submit** (~late Oct)  
**Not asking for:** Full pen test, SOC2, or multi-week engagement

---

## Product (one paragraph)

**Next Train** — unofficial Perth Transperth leave-by companion. Capacitor Android + static web on **Vercel** (`https://next-train-app.vercel.app`). No user accounts. Journeys/prefs on-device. Near me uses device location locally. Live times via our `/api/*` → Transperth. Android: home-screen widget, local leave reminders, AdMob banner, one-time Play Billing remove-ads (A$3.99). Dead “Heading to station” FGS removed from ship build. iOS later via Jon.

**Support:** EvansAppStudio@gmail.com  
**Privacy:** `https://next-train-app.vercel.app/privacy.html`  
**About:** `https://next-train-app.vercel.app/about.html`

**Status now:** Play closed testing Alpha **2.1.0** submitted (in Google review). You’ll get the closed opt-in / build once it’s available to testers.

---

## What we need from you

1. **Agree a lean checklist** (below is our draft — edit freely).  
2. **Review** against the **Play closed-test build** (as soon as it’s installable; soft window **now → mid-Sep**).  
3. **Written sign-off** (email/Slack is fine) before Tim flips Play public (~15–17 Sep).  
4. Repeat for **iOS** before App Store submit (after Tim returns from holiday 10 Oct; target review ~13–20 Oct).

Tim holiday **27 Sep – 9 Oct** — please don’t schedule must-have Tim meetings in that window.

---

## Lean checklist (Dwayne accepted 11 Aug 2026)

| Area | What to look at |
| --- | --- |
| **Permissions** | Location, notifications, exact alarm — justified vs UX; confirm no DATA_SYNC FGS in ship AAB |
| **Data at rest** | Journeys/prefs local only; backup rules (S-04); no secrets in repo |
| **Network** | HTTPS API; query params/logs; rate limit / station allowlist (S-03) live on Vercel |
| **WebView / XSS** | S-01 sinks closed — `innerHTML`, share URL params, external links |
| **Deep links** | `nexttrain://` host allowlist only |
| **Ads / IAP** | Prod AdMob (`admobTestMode` off); Play Billing path; client IAP risk accepted (S-05) |
| **Privacy claims** | `privacy.html` / About / Play Data safety match build |
| **Release hygiene** | Signing, debuggable off, no test/debug query wipe in prod paths, no test keys |
| **Dev/debug leftover** | Pre-ship spot-check: `?reset=`, `?widgetDebug=`, always-on debug plugin methods gated or gone |

**Out of scope for v1 (Tim aware — accepted residual):** UMP/EU consent SDK, server-side IAP receipt verify, CORS origin lockdown, cert pinning, full third-party pen test.

Engineering trail: `docs/simon-brief-security-hardening.md` + `docs/jim-brief-security-*.md` (S-01→S-06).

### Schedule (Dwayne)

| Milestone | Window |
| --- | --- |
| Closed Alpha 2.1.0 installable | ASAP when Tim sends opt-in |
| Lean review + findings (if any) to Jim | Within **5 business days** of installable build |
| **Written Play sign-off** | Target **by 12 Sep 2026** (buffer before ~15–17 Sep public) |
| Tim OOO | **27 Sep – 9 Oct** — no Tim-blocking meetings |
| iOS lean review + sign-off | **~13–20 Oct** (after Tim returns) |

---

## Dwayne reply (recorded)

> Checklist accepted with one add (dev/debug leftover spot-check). Soft window confirmed — review starts when Alpha 2.1.0 opt-in lands; written Play sign-off targeted **by 12 Sep**. Ping me the closed-test link when Google clears it. — Dwayne, 11 Aug 2026

## Dwayne review (recorded 11 Sep 2026)

> Lean review done against 3.0.0 (source + merged release manifest + live Vercel). Not signed off yet:
> the scope has grown from Perth-only to 33 regions incl. UK/EEA since the checklist was agreed. Blocking:
> D-01 EU/UK ad consent (Tim decision), D-02 privacy/Data safety accuracy, D-03 cleartext in release
> manifest, D-04 open `/api/feedback`. Sign-off realistic **Tue 16 Sep** if fixes merge by Mon 15 Sep.
> Full report: `docs/dwayne-security-review-play-3.0.0.md`. Jim brief: `docs/jim-brief-security-launch-fixes.md`.
> — Dwayne
>
> **Re-check 13 Sep:** no change on master @ `57b6325`; D-01 to D-04 all still open. See the report's re-check section.

---

## Access we’ll provide

- Repo access (or zip) + this brief  
- Closed-test opt-in link / build when Google clears review  
- Privacy/About URLs on Vercel (live now)  
- PM available for questions; Jim for remediations

---

## Sign-off line (copy when happy)

> I have completed a lean security review of Next Train (Android / Play RC) against the agreed checklist. Findings are closed or accepted. **Signed off for Play public release.** — Dwayne, \<date\>

(iOS variant later.)

---

## Slack-ready (Tim → Dwayne)

> Dwayne — need your lean security sign-off before Next Train goes public on Play (~mid-Sep). Brief: `docs/dwayne-brief-security-signoff.md`. Not a full pen test — checklist + closed-test build review. Closed Alpha 2.1.0 is in Play review now; I’ll send the opt-in/build when it’s live. Can you confirm the checklist and a review window before ~15 Sep? Tim OOO 27 Sep–9 Oct.
