# Jim brief: Done sometimes needs two taps (Menu / Reminders)

**For:** Jim  
**From:** Tim (QA)  
**Priority:** Medium — intermittent UX annoyance  
**Related:** `public/app.js` (`closeMenuDialog`, `openMenu`), `public/leave-reminders.js` (`saveRemindersDialog`, `openRemindersDialog`)

---

## Problem

Tim occasionally needs to tap **Done twice** to dismiss:

- **Menu** dialog (`#menu-done-btn`)
- **Reminders** dialog (`#reminders-done-btn`)

Feels random; more likely **after some activity** (toggling options, opening from Menu, after journeys, etc.).

---

## Automated repro (web)

```bash
node qa/done-double-tap-repro.mjs
```

**Result:** **Did not reproduce** on web (`test=1`, fixture). Single Done closes Menu, Menu→Reminders→Done, after Journeys→Menu→Done, double-click Done — all `anyDialogOpen === 0`.

Likely **native Android WebView** and/or **async Reminders save** path.

---

## Code paths (why two taps might happen)

### Reminders Done → `saveRemindersDialog()` (not plain close)

```javascript
document.getElementById("reminders-done-btn")?.addEventListener("click", () => {
  saveRemindersDialog();
});
```

| Platform | First Done behaviour |
|----------|----------------------|
| **Web** | `closeRemindersDialog()` immediately — should always one tap |
| **Native** | `validateCommuteDraft()` → may **alert** and **return** (e.g. Reminder on without usual train time) → **no close** until fixed |
| **Native** | Async: `persistReminderJourneys` → `healReminderSettings` → `reschedule` → `updateRemindersDialogUi` → **then** close. Dialog **stays open** during awaits — second tap if user thinks first failed |

**Fix direction:** Disable Done while save in flight; or close immediately and save in background; show brief “Saving…” on button.

### Menu Done → `closeMenuDialog()`

Then calls `fetchNextTrain()` or `fetchNearbyBoard()` — network refresh after close. On slow device, user might tap Done again if UI feels stuck (dialog should already be closed).

**Fix direction:** ensure `close()` + `removeAttribute('open')` synchronously; optional loading on main chrome not mistaken for open dialog.

### Incomplete menu close when opening sub-screens

`openRemindersDialog()` closes menu manually but does **not** call `closeMenuDialog()` — skips `menuBtn` `aria-expanded` / `menuChromeAction--open` reset.

`menu-widget-btn` (widget.js) only `menuDialog.close()` — not full `closeMenuDialog()`.

Could leave **chrome state** inconsistent (not necessarily dialog still open).

### No `cancel` handler on `#reminders-dialog`

Menu has `cancel` + backdrop click → `closeMenuDialog`. Reminders has `close` listener only — edge cases on Android back gesture?

### `visibilitychange` while Reminders open

```javascript
if (dialog?.open) {
  renderRemindersDialog(); // async re-render while open
}
```

Possible race if user taps Done during re-render (device unlock).

---

## Manual repro (Android, Tim)

1. `cap:sync` + debug APK.
2. **Menu:** Open Menu → tap Done once → expect dismiss. Repeat after opening **Help** (note: Help **closes Menu** — Done on Menu is gone; back to main after Help Got it).
3. **Reminders:** Menu → Reminders → toggle **Reminders** on, journey **Reminder** on, set time → Done once.
4. **Failure case:** Reminder on, **no usual train time** → Done → alert? → fix → Done again (expected two taps).
5. **Failure case:** Done immediately after toggling nudge/pause — tap once, wait 2s, tap again — does first tap close after delay?
6. Note whether **dimmed backdrop** remains after first Done (ghost modal).

---

## Fix direction (suggested)

1. **Reminders:** `saveRemindersDialog` — guard with `saveInFlight`; disable Done + label “Saving…” during async native save; or close first then persist.
2. **Validation:** keep alert but make error visible inline (avoid silent “nothing happened”).
3. **Unified close helpers:** `openRemindersDialog` / widget menu entry call `closeMenuDialog()` (or shared `closeMenuDialogOnly()`) so aria/chrome resets.
4. **Reminders:** add `cancel` + backdrop click → same as Done on web (close without save? or save — product choice).

---

## QA acceptance

- Menu: one Done always dismisses (web + Android).
- Reminders web: one Done.
- Reminders native: one Done after typical edits; validation errors show without “dead” first tap.
- `node qa/done-double-tap-repro.mjs` stays green on web.

---

## Slack-ready

> Intermittent **Done ×2** on Menu / Reminders — web repro clean; suspect native async `saveRemindersDialog` or validation alert. Brief: `docs/jim-brief-done-double-tap.md`.
