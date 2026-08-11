# Jim brief: Remove dead Heading-to-station FGS (Play DATA_SYNC)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product) · Dwayne (flag)  
**Date:** 11 Aug 2026  
**Status:** Ready to code — **P0 Console unblock** (before next closed AAB)  
**Related:** `CommuteNotificationService` · `CommuteModePlugin` · `public/commute-mode.js` · Play App content → Foreground service types · `docs/jim-brief-commute-strip-notification.md` (P2 — superseded for reuse until rebuilt)  
**Out of scope:** Leave reminders; home-screen widget; `applyCommuteMode()` in `app.js` (journey/Near me mode switch — **keep**); rebuilding the P2 commute strip

---

## 1. Why

Play Console asks Tim to declare **`FOREGROUND_SERVICE_DATA_SYNC`**. That permission exists only for **Heading to station** — an old ongoing-notification / foreground-service mode.

**Fact check (locked):**

| Piece | Status |
| --- | --- |
| UI start control `#commute-mode-start` / section | **Gone** from `index.html` |
| `public/commute-mode.js` | **Not** loaded by the app |
| Native service + plugin | Still in the APK / manifest |
| User-reachable path today | **None** — dead leftover |

Declaring a user-initiated `dataSync` FGS for a feature nobody can start is the wrong answer (and Google often wants a **demo video**). **Remove** the dead path so the next AAB no longer declares `DATA_SYNC`.

---

## 2. Decision (locked)

**Delete** the Heading-to-station stack from the ship build.

Do **not**:

- Invent Console copy / video for a dead feature  
- Leave the permission “just in case” for P2  
- Touch leave reminders or the widget  

**Strip note:** Commute strip is briefed **without** FGS (`docs/jim-brief-commute-strip-notification.md` — alarms + ongoing notif + chronometer). Do **not** keep orphan Heading code “for the strip.”

---

## 3. Implementation

### 3.1 Delete / unregister (Android)

| Remove | Path |
| --- | --- |
| Service | `android/.../CommuteNotificationService.java` |
| Plugin | `android/.../CommuteModePlugin.java` |
| Registration | `MainActivity.java` → `registerPlugin(CommuteModePlugin.class)` |
| Manifest `<service>` | `.CommuteNotificationService` (`foregroundServiceType="dataSync"`) |

### 3.2 Manifest permissions

Remove **both** if nothing else needs them (today nothing else does):

```xml
android.permission.FOREGROUND_SERVICE
android.permission.FOREGROUND_SERVICE_DATA_SYNC
```

After delete, grep the `android/` tree: zero hits for `CommuteNotification`, `CommuteMode`, `FOREGROUND_SERVICE_DATA_SYNC`, `foregroundServiceType`.

Keep `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` — used by leave reminders / widget.

### 3.3 Web leftover

| Remove | Notes |
| --- | --- |
| `public/commute-mode.js` | Orphan; not in `index.html` script list |
| Any docs/tests that assume Heading UI is live | Update or delete stale steps only |

**Do not** rename or remove `applyCommuteMode` in `app.js`.

### 3.4 Sync / build

`npm run cap:sync` after native/web deletes. Tim rebuilds **signed AAB** and re-uploads closed track so Play’s permission list drops `DATA_SYNC`.

---

## 4. Acceptance

| Check | Pass |
| --- | --- |
| No `CommuteNotificationService` / `CommuteModePlugin` in tree | Yes |
| Manifest has **no** `FOREGROUND_SERVICE_DATA_SYNC` (and no orphan `FOREGROUND_SERVICE` if unused) | Yes |
| App installs; Journey / Near me / widget / leave reminders still work | Unchanged |
| Merged AAB / Play App bundle details | `DATA_SYNC` / that FGS type **gone** |
| Play App content → Foreground services | Tim can mark **not used** / clear the declaration for this type |

---

## 5. Tim (Console — after new AAB)

1. Upload new closed AAB.  
2. App content → **Foreground service types**: do **not** claim `dataSync` for Heading to station.  
3. If the form still lists it from the old bundle, wait for processing / select the new version.

---

## Slack-ready (Tim → Jim)

> Jim — go `docs/jim-brief-remove-commute-fgs.md`. Dead **Heading to station** FGS: delete service/plugin/JS + drop `FOREGROUND_SERVICE_DATA_SYNC` (and unused `FOREGROUND_SERVICE`) so Play stops asking. Don’t touch leave reminders, widget, or `applyCommuteMode` in app.js. P2 commute strip can rebuild later. `cap:sync` when done.
