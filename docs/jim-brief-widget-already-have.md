# Jim brief: Widget already on home screen

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Related:** `public/widget.js`, `android/.../WidgetSyncPlugin.java` (`requestPinWidget`), Menu **Add home screen widget**, `docs/jim-brief-widget-help-pin-first.md`  
**Out of scope:** Per-widget journey selection, iOS, changing default 2×1 pin size

---

## 1. Problem

Menu → **Add home screen widget** / help **Add widget** always calls `requestPinAppWidget`. If the user already has a Next Train widget, Android happily pins a **second** instance.

All instances show the **same** active journey — so a second widget is usually a useless duplicate.

---

## 2. Goal

If **≥1** Next Train widget is already on the launcher:

1. Be honest: *you already have one*.  
2. Don’t lead with “Add widget” as if it’s first-time.  
3. Still allow adding another (size / second screen) as a **secondary** action.

If **0** widgets: keep today’s pin-first help flow unchanged.

---

## 3. Detect existing widgets

Use `AppWidgetManager.getAppWidgetIds(ComponentName for NextTrainWidgetProvider)`.

Expose to WebView, e.g. plugin method:

`getWidgetInstanceCount()` → `{ count: number }`

(or `hasWidget: boolean` — count is better for copy).

Call when opening the widget help dialog and when rendering Menu (optional: only needed in help dialog for v1).

---

## 4. UX when `count >= 1`

### Help dialog (`#widget-help-dialog` or equivalent)

**Title:** keep short — e.g. **Home screen widget** (or keep existing title if fine).

**Body (primary):**

> You already have a Next Train widget on your home screen.

**Secondary tip (one line):**

> Long-press to resize for a roomier layout.

(Optional second tip, if space: *Long-press also lets you move or remove it.*)

Same resize line appears in **Menu → Help** and the first-time widget help dialog.

**Actions:**

| Control | Role |
|---------|------|
| **Done** / close | Primary dismiss |
| **Add another** | Secondary / text button — still calls `requestPinWidget` |

Do **not** auto-pin on open.  
Do **not** block pinning entirely — Tim may want 2×1 + larger, or a second home page.

Optional: if pin unsupported, keep today’s manual long-press steps under a collapsed “How to add another” — same as pin-fail path.

### Menu row

Keep label **Add home screen widget** (discovery). Opening the dialog shows the “already have one” state — no need to rename the Menu row unless cheap.

### Coach / first-time

Unchanged: only when no widget yet / coach not done. Don’t show “already have one” on the staggered coach if they’ve never pinned (count still 0).

---

## 5. UX when `count === 0`

Existing pin-first copy (`jim-brief-widget-help-pin-first.md`): benefit line + **Add widget** primary. No change.

---

## 6. Acceptance

1. No widgets → help dialog as today (Add widget primary).  
2. ≥1 widget → dialog says already have one + resize/remove tip; **Add another** secondary still pins.  
3. Pinning still works for a second instance when user chooses Add another.  
4. Web: Menu widget row stays hidden (as today).  
5. `npm run cap:sync` after web changes; rebuild APK for native count API.

---

## 7. Files (likely)

| File | Change |
|------|--------|
| `WidgetSyncPlugin.java` (or widget plugin) | `getWidgetInstanceCount` |
| `public/widget.js` | Branch help UI on count |
| `public/index.html` | Already-have copy / Add another control |
| `TESTING.md` | Already-have widget row |

---

## 8. Summary for Jim

> If the user already has ≥1 Next Train home-screen widget, don’t pitch Add widget as first-time. Show *You already have a Next Train widget* + *Long-press to resize for a roomier layout.*, with **Add another** as secondary (still pins). Zero widgets = today’s pin-first flow. Expose widget instance count from native.
