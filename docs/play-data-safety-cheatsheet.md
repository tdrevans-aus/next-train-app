# Play Console — Data safety cheat sheet (Tim)

**Use when filling Play Console → App content → Data safety.**
**Source of truth:** `docs/jim-brief-privacy-copy-3.0.0.md` + live `privacy.html` after that PR +
Vercel deploy.
**Do not invent collection** the app doesn't do.

**Privacy URL:** `https://next-train-app.vercel.app/privacy.html`
**About URL:** `https://next-train-app.vercel.app/about.html`
**Support email:** `EvansAppStudio@gmail.com`

---

## Quick answers

| Question theme | Guidance |
| --- | --- |
| Account creation | **No** — no login |
| Location | **Yes** — approximate and/or precise for **Near me** (app functionality). Processed on device to pick nearest station; **we do not upload GPS to our servers**. Station name may go to our API for times. |
| Personal info → Email address | **Yes, optional** — collected only if a user types one into Menu → Send feedback, to reply to them. Not shared, not used for ads, not linked to any account (there is none). |
| Crash logs | **Yes** — Sentry (US-hosted third-party processor). Collected for app stability; not shared for advertising or personalisation; not linked to an identity; **cannot be deleted on request** (no account, no way to tie a report back to a person). |
| Diagnostics | **Yes** — same Sentry collection: device/OS info, app version, session data, and breadcrumbs including station + direction from automatic API-request logging. |
| Financial info | Purchases via **Google Play**; we don't collect card numbers |
| Photos / contacts / SMS | **No** |
| App activity / Device or other IDs | Follow Google's AdMob questionnaire guidance. In the **EEA/UK, ads (and any associated ad-related data collection) only run after the user consents via the UMP form** (Menu → Privacy options lets them withdraw consent at any time). Outside the EEA/UK, behaviour is unchanged. |
| Notifications | Local leave reminders — on-device; not server push marketing |
| Data shared with third parties | **AdMob / Google** for ads (when not ad-free; EEA/UK gated on consent); **Sentry** for crash diagnostics (US); **Formspree** relays the feedback form to our inbox; live times relayed through our API to the relevant operator (TfNSW, TfL, National Rail, Trafiklab, Digitransit, Entur and others — station/direction, not identity). |
| Data encrypted in transit | **Yes** (HTTPS) |
| Users can request deletion | Local: Clear all data / uninstall removes on-device data. No cloud account to delete. Crash reports and feedback emails aren't linked to an identity, so there's nothing to look up by user — email `EvansAppStudio@gmail.com` for anything specific. |
| Kids | Target audience general; not directed at children |

---

## Listing hygiene (same session)

- [ ] Privacy policy URL pasted (HTTPS above)
- [ ] App access: no restrictions / no login
- [ ] Ads: yes (AdMob) unless every build is ad-free (it isn't); note EEA/UK UMP consent gate
- [ ] Description reflects 33 regions (AU, UK, SE, FI, NO) — not Perth-only
- [ ] Remove ads price shown as **A$7.99** (not A$3.99)

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | Tim cheat sheet spun out for bull-run console day |
| 2026-09-13 | 3.0.0 refresh (docs/jim-brief-privacy-copy-3.0.0.md, D-02): added Sentry crash/diagnostics row, corrected the "email collected in-app" row from No to Yes/optional (feedback form), multi-region operator note replacing Transperth-only, A$3.99 → A$7.99, and the EEA/UK UMP ad-consent note. |
