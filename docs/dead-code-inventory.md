# Dead / unused code inventory

**Owner:** Tim (product) · Simon keeps list current · Jim removes when briefed  
**Rule:** **v1 closed AAB** = FGS / Heading-to-station only. Everything else waits for **closed-testing v2** (or later) unless Tim accelerates.

**Last trawl:** 15 Aug 2026

---

## v1 — do now (Play Console unblock)

| ID | Artefact | Why dead | Action | Brief |
| --- | --- | --- | --- | --- |
| **D-01** | `CommuteNotificationService` + `CommuteModePlugin` + `public/commute-mode.js` + manifest `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_DATA_SYNC` | Heading to station UI gone; nothing starts the FGS; Play asks for a `DATA_SYNC` declaration | **Delete** stack; Tim re-uploads AAB | `docs/jim-brief-remove-commute-fgs.md` |

**Do not** invent Console copy/video for D-01.

---

## Closed-testing v2 — cleanup batch (parked)

Ship a Jim brief when Tim opens v2. Safe deletes / packaging only — no product behaviour change.

| ID | Artefact | Why | Confidence | Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| **D-02** | Capacitor `FileProvider` + `res/xml/file_paths.xml` | Template leftover; no `getUriForFile` / share usage in app code | High | Low | Check Capacitor doesn’t regenerate on `cap sync`; if it does, ignore-pattern or leave |
| **D-03** | Empty legacy CSS hooks in `styles.css` (`.skip-train-btn`, `.earlier-train-btn`, `.commute-mode`, `.details`, `.detail-card`, `.leg-toggle`, `.journey-toggle`, `.settings-leg`, empty `.header`) | Comment admits unused; no JS class usage | High | None | Delete the block |
| **D-04** | `nextTrainAdsLoaded` (`ADS_LOADED_KEY` in `ads.js`) | Write-only localStorage; never read | High | None | Remove setItem + Clear-all exemption in `app.js` |
| **D-05** | Ship packaging: `public/design/*.html`, `public/*.mjs` sources, `site-config.example.json` inside APK `webDir` | Design pickers / esbuild sources / example config aren’t product UI | High | Low if moved, not deleted | Prefer `capacitor` `android.webContentsDebuggingEnabled` / asset ignore **or** move sources to `src/` and keep bundles in `public/` |

### Resolved Aug 2026 (FB-27 Phase 4)

| ID | Status | Action taken |
| --- | --- | --- |
| **D-05** | **Resolved** | Moved `public/design/` → `design/`, `public/*.mjs` → `web-sources/`, `site-config.example.json` → `config/`; esbuild + dev-server updated |
| **D-06** | Legacy coach LS keys `nextTrainWidgetCoachDismissed` / `nextTrainLeaveReminderCoachDismissed` | Migration-only in `stickiness-coaches.js` | Med | Loses dismiss state for old installs | Drop after soak, or keep forever (tiny) |
| **D-07** | Doc hygiene: `qa-leave-reminders-v2-testing.md` may be stale vs implemented v2 | Misleads QA | Med | Docs only | Strip brief rewritten non-FGS (11 Aug); refresh QA doc when convenient |
| **D-08** | Optional: old store creative drafts under `store-assets/` (superseded icon concept dirs already archived intentionally) | Clutter | Low | None | Declutter only if Tim wants; **keep** locked icon + feature graphic |
| **D-09** | `#preferred-hint` + `jumpToTargetTrain()` / `skipToTargetTrain()` | Was parked as “hidden UI” | — | — | **Resolved — kept active** (Aug 2026): jump hint wired; `skipToTargetTrain` sets skip to preferred index; `jumpToTargetTrain` clears skip — different QA/API paths. See `qa/leave-by-preferred-gate.mjs`. |

### Resolved Aug 2026 (FB-24 Phase 1)

| ID | Status | Action taken |
| --- | --- | --- |
| **D-03** | **Resolved** | Deleted empty legacy CSS hooks (`.header { display: contents }`; other D-03 selectors already absent) |
| **D-04** | **Resolved** | One-time `localStorage.removeItem("nextTrainAdsLoaded")` in `app.js` `init()` — key was write-only / never read |
| **D-09** | **Resolved — kept active** | Product decision: keep jump-to-target UX; do not delete `skipToTargetTrain` or `jumpToTargetTrain` |

---

## Confirmed **live** — do not “clean”

| Artefact | Looks confusing because… | Actually |
| --- | --- | --- |
| `CommuteRefreshService` / `CommuteSchedule` / `NextCommutePreview` | “Commute” name | Widget + reminder refresh engine |
| `applyCommuteMode()` in `app.js` | Same word | Journey / Near me mode switching |
| Leave reminders + `SCHEDULE_EXACT_ALARM` / `POST_NOTIFICATIONS` / boot receiver | Notifications | Live product |
| Widget receivers / `WidgetSyncPlugin` | Many classes | Live product |
| AdMob / IAP / geolocation plugins | Permissions in Play | Live product |
| `public/*-bundle.js` + matching `*-native.mjs` | `.mjs` not in `<script>` | Build sources → bundles; keep both unless packaging move (D-05) |

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-11 | First trawl after Dwayne FGS flag; D-01 briefed for v1; rest parked for closed-testing v2 |
| 2026-08-11 | Strip brief rewritten **non-FGS**; D-07 strip half closed |
| 2026-08-15 | FB-24 Phase 1: D-03/D-04 resolved; D-09 resolved — kept active (`jumpToTargetTrain` + `skipToTargetTrain`) |
