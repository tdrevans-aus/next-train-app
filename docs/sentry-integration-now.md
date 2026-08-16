# Sentry integration — action checklist (Tim, while Jim is busy)

**Repo:** `tdrevans-aus/next-train-app`  
**Jim brief:** `docs/jim-brief-crash-analytics.md` (crashes first — **implemented**)  
**Automation pipe:** `docs/moron-guide-sentry-to-cursor.md` (Sentry → GitHub → Cursor PR)

---

## Already done in the app

| Item | Status |
| --- | --- |
| `@sentry/capacitor` + `analytics-native.mjs` | Wired |
| `sentryDsn` in `public/site-config.json` | Set (rebuild with `npm run cap:sync` for device) |
| Release tag | `next-train@2.1.2` / dist `9` on events |
| Product breadcrumbs | `app_open`, `journey_saved`, `reminder_enabled`, `api_error_shown`, `iap_*`, `widget_pin_requested` |
| Test crash helper | `await window.NextTrainAnalytics.testCrash()` (debug only) |
| Test crash filtered from Sentry | `beforeSend` drops `test crash (debug)` so alerts stay clean |

Local smoke: `npm start` → open app → `window.NextTrainAnalytics.isEnabled()` should be `true`.

---

## Do now in Sentry (≈15 min)

### 1. Open Issues

[Sentry](https://sentry.io) → project for Next Train (Capacitor / browser). **Issues** is where crashes land.

### 2. Connect GitHub

1. **Settings** → **Integrations** → **GitHub** → Install.
2. Grant access to **`tdrevans-aus/next-train-app`** only.
3. Confirm: open any issue → sidebar can **Create GitHub issue**.

### 3. Alert → GitHub (not email-only)

1. Project → **Alerts** → **Create Alert**.
2. **When:** *A new issue is created* (or equivalent).
3. **Then:** **Create a GitHub issue** → `tdrevans-aus/next-train-app`.
4. Optional: also email yourself as FYI.
5. Save.

**Test:** debug build + `await window.NextTrainAnalytics.testCrash()` should **not** open GitHub (filtered). A real crash in a release build should create an issue within ~1–2 minutes.

### 4. Optional: Sentry in Cursor chat

Cursor **Settings → MCP** → add **Sentry** (marketplace plugin if available). Then you can ask the agent to summarize open issues without opening the Sentry UI.

---

## Cursor Automation (after GitHub alert works)

See `docs/moron-guide-sentry-to-cursor.md` Part C:

- **Trigger:** GitHub issue opened (Sentry-created issues; add `sentry` label if you want to narrow).
- **Action:** Agent reads stack trace → smallest fix → PR → comment on issue.
- **BLOCKED:** if needs Play Console, secrets, or product decision.

---

## Ship checklist

After any `site-config.json` or web asset change:

```powershell
cd "C:\Users\tdrev\Projects\Next Train App"
npm run cap:sync
# then signed release AAB in Android Studio
```

Confirm `android/app/src/main/assets/public/site-config.json` contains `sentryDsn` before upload.

---

## Who does what

| Task | Who |
| --- | --- |
| Sentry SDK + events in app | Jim (**done**) |
| Sentry ↔ GitHub + alert rule | Tim (Sentry UI) |
| Cursor “Sentry crash → fix PR” automation | Tim (Automations UI) |
| Merge / Play upload | Tim |
