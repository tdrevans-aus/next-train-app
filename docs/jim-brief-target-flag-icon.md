# Jim brief — Target flag icon + on/off state

**Status:** **Superseded 2026-08-14** — pin chrome (FB-14 Near me, FB-20 journey) replaces flag; FB-17 removed from backlog. Kept for history only.

**For:** Jim (implement)
**From:** Tim (product) via Ruth
**Date:** 13 Aug 2026
**Design reference:** `public/design/target-icon-pick.html` — **Option 1 (Flag) is chosen**
**Out of scope:** changing what a target time *is*, the leave-by maths, widget refresh plumbing

---

## 1. Why

Two problems with today's target icon:

1. It doesn't read as anything recognisable at widget size.
2. It has no state. **Near me** and **My Journeys** in the top chrome each have a clear
   active / inactive treatment, so users can tell at a glance what is on. The target
   indicator should follow the same rule: you should be able to tell whether a target
   time is set **without reading the text**.

A crosshair/target shape was rejected: **Near me** already owns the crosshair, and the
line means *the train time you're aiming for*, not a location.

---

## 2. The icon

Replace the current target glyph with the **flag** from the design page.

```
<!-- 24×24, currentColor, matches chrome stroke language -->
<svg viewBox="0 0 24 24" fill="none">
  <path d="M6 21V4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
  <path d="M6 4.6h10.8l-2.4 3.7 2.4 3.7H6z" fill="currentColor" />   <!-- ON: filled -->
</svg>
```

**Off variant** is the same geometry with the pennant as an outline instead of a fill:

```
<path d="M6 4.6h10.8l-2.4 3.7 2.4 3.7H6z" stroke="currentColor" stroke-width="1.7" fill="none" />
```

Keep the pole identical between states so the icon doesn't appear to move or resize when
it toggles. At the small end (~13–16px) bump stroke to ~2.4 so the pole doesn't disappear.

---

## 3. States

| State | When | Icon | Colour | Text |
| --- | --- | --- | --- | --- |
| **On** | A target time is set for the active journey **and** applies to the trip shown | Filled pennant | Accent `--accent` | `Target 7:30` |
| **Off** | No target time set for the active journey | Outline pennant | `--muted` | `Set target` (or hide the line — see §5) |
| **Inactive** | Target set but not relevant to the displayed trip (e.g. user has swiped to another train) | Outline pennant | `--muted` | `Target 7:30` |
| **Pressed** | While tapped | Either | `--accent-strong` | — |

Use the **same mechanism the chrome already uses** for Near me / My Journeys active state —
don't invent a second convention. Match whatever class or attribute those controls toggle
so there is one source of truth for "this control is on".

Dark surfaces: on = the lighter teal already used for widget accents; off = the existing
muted-on-dark colour. Never render the off state so faint it looks like a rendering bug.

---

## 4. Behaviour

- Tapping the target line/icon opens the **existing** target-time editor for the active
  journey. No new sheet — reuse what's there.
- Setting a target → state goes **On** immediately, no refresh required.
- Clearing a target → state goes **Off** immediately.
- The control must never block or overlay the leave-by hero.

---

## 5. Off-state question for Tim

Two options when no target is set — **implement A unless Tim says otherwise**:

- **A. Show the row, muted, reading `Set target`.** Discoverable; teaches the feature.
- **B. Hide the row entirely.** Cleaner, but the feature stays invisible to most users.

---

## 6. Widget parity (Android)

The home-screen widget can't use CSS, so:

- Ship **two drawables** (`ic_target_flag_on`, `ic_target_flag_off`) or one drawable with a
  tint applied per state.
- Widget state is derived from the same target data the app uses — do not compute it
  separately, or the two will drift.
- Keep the icon **muted/supporting** on the widget, not accent teal, so the leave-by
  number stays the only loud element. (Tim can promote it to accent later; make the colour
  a single constant so that's a one-line change.)
- Never show the on state with stale or placeholder data — if the widget is mid-update,
  keep the previous state rather than flashing off.

---

## 7. Accessibility

- Content description / `aria-label` must state both the meaning and the state, e.g.
  `Target train time 7:30, set` and `Target train time, not set`.
- Colour alone must not carry the state — the fill vs outline difference is the
  non-colour signal, so keep it obvious.
- Hit area at least 44×44 in the app, even though the icon is small.

---

## 8. Acceptance

| Check | Pass |
| --- | --- |
| Flag replaces old target glyph in app and widget | |
| On = filled + accent; Off = outline + muted; identical pole geometry | |
| Uses the same active-state convention as Near me / My Journeys | |
| Tap opens the existing target editor; state updates without refresh | |
| Legible at ~13px on both light and dark home screens | |
| Widget state derives from the same data as the app | |
| Screen reader announces meaning **and** state | |

---

## 9. Slack-ready (Tim → Jim)

> Jim — swapping the widget/app target glyph to a **flag**, and it needs a real on/off
> state like Near me and Journeys have. Brief: `docs/jim-brief-target-flag-icon.md`,
> visual: `public/design/target-icon-pick.html` (Option 1). On = filled pennant + accent,
> off = outline + muted, same pole so it doesn't jump. Reuse the existing chrome
> active-state convention and the existing target editor — no new sheet.

---

## Change log

| Date | Note |
| --- | --- |
| 2026-08-13 | Flag chosen over crosshair (collided with Near me); on/off state added |
| 2026-08-13 | **Parked** — deferred from current release; see `docs/feature-backlog.md` **FB-17** |
| 2026-08-14 | **Superseded** — pin chrome (FB-14 Near me, FB-20 journey) replaces flag; **FB-17** removed from backlog |
