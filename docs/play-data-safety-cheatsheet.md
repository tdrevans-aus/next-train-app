# Play Console — Data safety cheat sheet (Tim)

**Use when filling Play Console → App content → Data safety.**  
**Source of truth:** `docs/jim-brief-security-privacy-copy.md` + live `privacy.html` after Jim S-02 + Vercel deploy.  
**Do not invent collection** the app doesn’t do.

**Privacy URL:** `https://next-train-app.vercel.app/privacy.html`  
**About URL:** `https://next-train-app.vercel.app/about.html`  
**Support email:** `EvansAppStudio@gmail.com`

---

## Quick answers

| Question theme | Guidance |
| --- | --- |
| Account creation | **No** — no login |
| Location | **Yes** — approximate and/or precise for **Near me** (app functionality). Processed on device to pick nearest station; **we do not upload GPS to our servers**. Station name may go to our API for times. |
| Personal info (name, email collected in-app) | **No** (support email is contact only, not collected by the app) |
| Financial info | Purchases via **Google Play**; we don’t collect card numbers |
| Photos / contacts / SMS | **No** |
| App activity | Optional: declare only if AdMob questionnaire requires; follow Google ads defaults |
| Device or other IDs | Likely **Yes** via **AdMob** / Play — declare per Google’s ads guidance |
| Notifications | Local leave reminders — on-device; not server push marketing |
| Data shared with third parties | **AdMob / Google** for ads (when not ad-free); Transperth times via our API (station/direction, not identity) |
| Data encrypted in transit | **Yes** (HTTPS) |
| Users can request deletion | Local: Clear all data / uninstall. No cloud account to delete. |
| Kids | Target audience general; not directed at children |

---

## Listing hygiene (same session)

- [ ] Privacy policy URL pasted (HTTPS above)  
- [ ] App access: no restrictions / no login  
- [ ] Ads: yes (AdMob) unless every build is ad-free (it isn’t)  
- [ ] Unofficial — not affiliated with Transperth/PTA (description)

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | Tim cheat sheet spun out for bull-run console day |
