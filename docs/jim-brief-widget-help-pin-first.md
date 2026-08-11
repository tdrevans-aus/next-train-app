# Jim brief: Widget help dialog — pin-first copy + button

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code  
**Related:** `public/index.html` (`#widget-help-dialog`), `public/widget.js` (`requestPinWidget`, `openWidgetHelpDialog`), `docs/widget-homescreen.md`  
**Out of scope:** Widget layout, refresh logic, coach stagger timing, theme/colour settings

---

## 1. Problem

The **Add home screen widget** dialog tells users to go to the home screen, long-press, open Widgets, and drag — **then** offers **Try add widget**, which calls Android `requestPinAppWidget` and places the widget in one tap.

On supported devices (typical modern Android), the manual steps are **wrong for the happy path**. The button label **Try add widget** is weak. Body copy is also too long (size specs, leave-in hierarchy).

---

## 2. Goal

1. **Pin-first** — one tap adds the widget.  
2. **Manual steps** only as fallback (unsupported pin).  
3. Button **Add widget** (not “Try add widget”).  
4. **Add widget** primary; **Done** secondary.  
5. **Tight benefit copy** — no “tap the button,” no cell-size lecture.

---

## 3. Copy (final)

### Title

**Add home screen widget**

### Body — pin path (default visible)

**One paragraph only** (lead + note merged):

> **Add widget** puts your next train on the home screen without opening the app.

Then one tip line:

> Long-press to resize for a roomier layout.

- Bold **Add widget** to match the button label.  
- Do **not** say “Tap Add widget.”  
- Do **not** mention leave-in, active journey, or default 2×1 / cell size.  
- Do **teach resize** (not a second pin size in the dialog).

### Body — manual fallback

Hidden by default (`#widget-help-manual`, `hidden`):

> **Or add manually:** Go to your Android home screen. Long-press an empty area and choose **Widgets**. Find **Next Train** and drag it onto your home screen.

Show when:

- `requestPinWidget` → `requested: false`, **or**  
- plugin missing / catch error  

Do **not** show on first open when pin is supported.

### Buttons

| Control | ID | Label | Role |
|---------|-----|-------|------|
| Pin | `#widget-help-pin-btn` | **Add widget** | Primary (`btn-primary`) |
| Dismiss | `#widget-help-done-btn` | **Done** | Secondary (`btn-secondary`) |

Footer stack (match other dialogs):

```
[ Add widget ]   ← primary, full width OK
[ Done ]
```

Both ≥44px tap height.

---

## 4. Behaviour (`widget.js`)

### `openWidgetHelpDialog()`

- Reset: hide `#widget-help-manual`.  
- Show the single benefit paragraph.

### `requestPinWidget()`

1. User taps **Add widget**.  
2. Plugin missing → show manual block; keep dialog open.  
3. `requested === true` → system pin UI; mark coach done; close dialog **or** leave open (either OK).  
4. `requested === false` or catch → show `#widget-help-manual`; keep dialog open.

No native `WidgetSyncPlugin` changes unless required.

### Menu

**Menu → Add home screen widget** opens this dialog — same copy.

---

## 5. HTML structure (intent)

```html
<dialog id="widget-help-dialog" …>
  <div class="help-dialog-body">
    <h2>Add home screen widget</h2>
    <p class="widget-help-lead">
      <strong>Add widget</strong> puts your next train on the home screen without opening the app.
    </p>
    <p class="widget-help-tip">
      Long-press to resize for a roomier layout.
    </p>
    <p id="widget-help-manual" class="widget-help-manual" hidden>…manual fallback…</p>
  </div>
  <div class="help-dialog-footer">
    <button type="button" class="btn-primary" id="widget-help-pin-btn">Add widget</button>
    <button type="button" class="btn-secondary" id="widget-help-done-btn">Done</button>
  </div>
</dialog>
```

Remove `<ol class="widget-help-steps">` and the long `.widget-help-note` size paragraph.

---

## 6. CSS

- `.widget-help-tip` / `.widget-help-manual`: muted, small top margin.  
- Footer: primary = Add widget.  
- Remove orphaned `.widget-help-steps` / old note styles if unused.

---

## 7. Docs / QA

| File | Update |
|------|--------|
| `TESTING.md` | Pin-first; one benefit line; **Add widget** primary; manual on fallback only |
| `docs/widget-homescreen.md` | Help dialog: request-pin first; tight copy (optional one-liner) |

### Acceptance

1. Pin-supported Android: open dialog → **no** manual long-press steps.  
2. Body is the single benefit sentence above — no size / leave-in copy.  
3. Tap **Add widget** → system pin sheet.  
4. Pin unsupported → manual block after attempt (or on detect).  
5. Label **Add widget**, not “Try add widget”; primary vs Done correct.  
6. Web: menu item hidden; no regression.

---

## 8. Files (expected)

| File | Change |
|------|--------|
| `public/index.html` | Copy, structure, button classes |
| `public/widget.js` | Show/hide manual; reset on open |
| `public/styles.css` | Footer + manual; drop orphaned step styles |
| `TESTING.md` | Widget help row |
| `docs/widget-homescreen.md` | Optional short note |

No native Java changes expected.
