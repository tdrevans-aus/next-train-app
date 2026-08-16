# Jim brief: Near me pin + Leave By (v2.2.0)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** **Shipped** — copy/layout lock **15 Aug 2026** (do not revert to “Notify me” or full-width toggle row)  
**Release:** **v2.2.0** feature  
**Backlog:** FB-14  
**Related:** pin session in `public/nearby-mode.js`; leave card `#leave-card`; journey slider under Target; journey face change is **FB-20** (separate brief) — this brief is Near me + route pin leave card only  
**Out of scope:** Journey-mode pin (**FB-20** / `docs/jim-brief-journey-pin-preferred-target.md`); FB-17 target **flag** icon; GPS-derived walk time; Pro / monetization

---

## 1. Product rule (one sentence)

In **Near me**, the rider can **pin** any swiped departure; while pinned, that train stays on the main face **and** the widget, and a **Leave by** card appears with a walk slider and one **Remind me when to leave** control.

---

## 2. Locked decisions (do not reopen)

| ID | Choice |
|----|--------|
| **A1** | Pin icon = **map pin**, not flag. **Unpinned** = outline + muted. **Pinned** = filled + accent (same on/off language as Near me / Journeys chrome). |
| **B1** | Pin reveals **leave card** on the main screen with the **same Time-to-station slider** pattern as journeys. |
| **C2** | One master **Remind me when to leave** under the slider (label + toggle on one compact row — toggle **adjacent** to label, not full-width `space-between`). On ⇒ leave-now ping **and** Live countdown strip. Off ⇒ on-screen leave-by only (no shade). **Default off** — pin alone must not prompt for notification permission. |
| **D1** | While pin is **holding**, **widget always shows the pinned train** (+ leave-by). Pin **beats** journey active-hours. After unpin/expiry → normal widget path. |

**Why D1:** Pin is a recent, explicit act. Silently replacing it with a journey set weeks ago confuses people. Pin already expires ~1 min after departure, so it does not stick forever.

**C2 layout (Tim, 15 Aug 2026):** `#nearby-notify-section` is `inline-flex` / `width: fit-content` in `public/styles/hero.css`. **Hide** stays right in the footer grid. **Do not** use `justify-content: space-between` on the notify row — that pushes the toggle next to Hide.

---

## 3. Behaviour

### 3.1 Pin

1. Near me only. Swipe to any upcoming train on the hero.  
2. Tap **pin** on the departure/hero chrome → pin that `departureIso` + direction + station.  
3. Tap again (or clear) → unpin.  
4. **Hold window:** keep showing that train until **1 minute after departure** (existing `NEARBY_PIN_HOLD_MS = 60_000`), then auto-clear.  
5. Changing station (or leaving Near me) clears the pin.  
6. Swiping to another train while pinned: either retarget pin to the newly shown train **on explicit pin tap only** — do **not** auto-move the pin on swipe. (Swipe changes preview; pin stays until unpin / pin-on-new / expiry.)

### 3.2 Main screen while pinned

| Element | Behaviour |
|---------|-----------|
| Hero | Pinned departure (existing `applyNearbyPinToData`) |
| Leave card | **Visible** — leave-by = departure − Near me walk buffer |
| Walk slider | Same UX as journey detail Time-to-station (1–30 min). Label **Time to station**. |
| Remind me when to leave | Toggle under slider, **beside** label. Default **off** (permission on first enable). |
| Unpinned | Hide leave card + slider + remind toggle (journey Leave By rules unchanged when in Journeys mode). |

### 3.3 Near me walk buffer (not journey settings)

- Storage key e.g. `nearbyLeaveBeforeMinutes` (settings / localStorage).  
- Default **10**.  
- Editing the slider updates this value and **remembers** it for the next pin.  
- **Do not** read/write journey `leaveBeforeMinutes`.  
- **Do not** invent walk time from GPS km.

### 3.4 Remind me when to leave (C2)

| Remind me when to leave | On-screen leave-by | Leave-now ping | Live countdown strip |
|-------------------------|--------------------|----------------|----------------------|
| **Off** | Yes | No | No |
| **On** | Yes | Yes | Yes |

- First enable: reuse existing notification permission gate (`enableLeaveReminders` / same path as journeys). Deny → toggle stays/returns **off**; leave card + slider still work.  
- Scheduling is **ephemeral for this pin** — do **not** mutate journey `remindMe` / `commuteStripEnabled`.  
- On unpin / pin expiry / station change: cancel Near-me pin schedules (leave ping + strip for that target).  
- Native: extend leave-reminder / commute-strip path to accept a one-off Near me pin target (station, direction, departureIso, leaveBeforeMinutes, notify flags), or equivalent payload from JS sync.  
- **DOM ids** stay `nearby-notify-*` for compatibility; **visible copy** is **Remind me when to leave** only.

### 3.5 Widget (D1)

```text
if nearby pin is holding:
  widget face = pinned trip + leave-by (using nearbyLeaveBeforeMinutes)
else:
  existing commute / idle / journey logic
```

- Pin wins even if a journey’s Active hours say “show morning commute now”.  
- When pin clears, next widget refresh returns to the normal face.  
- Sync pin snapshot from JS → native widget payload whenever pin is set/updated/cleared.

---

## 4. UI notes (Simon)

- Pin control must read **pinned vs unpinned** at a glance without reading copy (outline vs filled + accent).  
- Prefer pin on the **departure card / hero** (near time), not Menu.  
- Leave card placement: existing `#leave-card` region on the main stack (B1) — expand with slider + **Remind me when to leave** only while pinned in Near me (or route pin).  
- Copy: **Pin** / **Pinned** / **Remind me when to leave** / **Time to station** / **Leave by** / **Hide**. Avoid “flag”, avoid “Target train”, avoid legacy **Notify me** on this surface.

---

## 5. Code touchpoints (starting points)

| Area | Where |
|------|--------|
| Pin session | `public/nearby-mode.js` — pin + leave card sync |
| Leave card markup | `public/index.html` `#leave-card`, `#nearby-notify-section` |
| Leave card layout | `public/styles/hero.css` — `.nearby-pin-leave-footer`, `.nearby-notify-row` |
| Slider pattern | Journey detail `#detail-leave-before-input` / `leave-before-field` — reuse styling/behaviour, separate state |
| Reminders | `public/leave-reminders.js` + Android `LeaveReminder*` / `CommuteStrip*` |
| Widget | `public/widget.js` sync + `WidgetUiBuilder.java` / commute preview |

---

## 6. Acceptance

1. Near me: outline pin on unpinned train; filled accent when pinned.  
2. Pin holds hero train until unpin or ~1 min after departure.  
3. While pinned: leave card + Time-to-station slider visible; leave-by matches departure − buffer.  
4. Slider default 10; last Near me value remembered; journey walk buffers unchanged.  
5. **Remind me when to leave** off → no leave ping, no strip; on → both (after permission). Deny permission → toggle off.  
6. Toggle sits **next to** label (compact row); **Hide** aligned right — not toggle stranded beside Hide.  
7. Unpin / expiry cancels Near me notifications and hides leave card.  
8. **Widget** shows pinned train (+ leave-by) for the whole hold window, overriding journey active-hours; after clear, widget falls back.  
9. Journey mode Leave By / Target / reminders behaviour unchanged.  
10. No journey `remindMe` / `leaveBeforeMinutes` / strip prefs written by Near me pin flows.

---

## 7. QA (minimum)

- Pin / unpin visual states; swipe does not steal pin without a pin tap.  
- Leave card only while Near me + pin holding.  
- Slider persistence across unpin → pin again.  
- Remind me when to leave grant / deny / revoke.  
- Footer layout: label + toggle grouped left; Hide right.  
- Widget: pin during journey Active hours still shows pin; after expiry shows journey/idle again.  
- Regression: journey Target + Leave By + Remind me / Live countdown still work.

---

## 8. Non-goals

- Pinning in Journeys mode  
- Replacing journey Target with a pin metaphor  
- FB-17 flag glyph on journey/widget target chrome  
- Auto walk-time from distance  
- Morph Leave-now → strip (FB-15)  
- Renaming `#nearby-notify-me` element id (copy only)

---

## 9. Change log

| Date | Note |
|------|------|
| 2026-08-15 | Tim locked C2 copy → **Remind me when to leave**; compact `inline-flex` row in `hero.css` (not `styles.css`) |
