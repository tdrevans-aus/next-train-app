# Design: Top chrome (3 labelled controls) + live modes

**For:** Jim (implement) / Tim (product)  
**Status:** **Implemented** (web + Capacitor Android) — keep this doc aligned with `public/app.js`, `public/index.html`  
**Related:** `docs/nearby-first-onboarding.md`, `docs/journeys-vs-settings.md`, `docs/widget-homescreen.md`, `docs/leave-by-notification.md`, `docs/ad-free-purchase.md`  
**Not in scope:** bottom tab bar

---

## 1. Decisions locked in

| Topic | Decision |
|--------|----------|
| Icon count | **3** (not 2, not 4) |
| Placement | **Top**, under/ beside brand — **not** a bottom bar |
| Labels | **Yes** — caption under every icon |
| Burger label | **Menu** (for consistency with the other two) |
| Default live screen | **Nearby mode** (nearest station board) |
| What **Near me / Nearby** does | Always **Nearby mode**. If already there → **recenter + refresh**. **Never** opens Journeys. |
| What **Journeys** does | Always **Journey mode** / setup. **Never** opens Nearby. |
| Empty journeys | Journey mode shows **setup empty state** (evolved “Tap to get started”) |
| Seeded in/out shells | **None** (per onboarding brief) |

---

## 2. Answering Tim’s questions directly

### “I’m already on Nearby — so Near me goes to Journeys?”

**No.** Shipped behaviour matches the contract:

- On Nearby → tap **Near me** → **recenter / refresh Nearby** (brief refresh animation on the control).  
- On Journeys → tap **Near me** → **return to Nearby**.  
- Tap **Journeys** for commute / empty setup / (second tap) manage list.

Chrome caption locked: **Near me**.

### “No journeys set up, but user taps Journeys — show Tap to set up?”

**Yes — same job as today’s setup hero, reframed.**

Main canvas switches to **Journey mode (empty)**:

- No leave card, no fake journey data  
- Clear setup prompt (see §5)  
- Primary action starts **Add a journey** (create sheet / detail), not system Menu  
- User can tap **Near me** anytime to return to the useful board  

Do **not** auto-dump them into the full journey form with no explanation unless they tap the CTA (wizard “Set up a journey” may go straight to create — that’s intentional).

---

## 3. Chrome layout (top)

```
Next Train                         [optional status]
┌──────────┐  ┌──────────┐  ┌──────────┐
│  ⌖ icon  │  │ route    │  │  ☰ icon  │
│ Near me  │  │ Journeys │  │  Menu    │
└──────────┘  └──────────┘  └──────────┘
```

**Order (LTR):** Near me · Journeys · Menu  

**Visual rules**

- Icon + **word underneath** (Birdies-style clarity, top placement)  
- Equal column width / hit height (comfortable ~44pt including label)  
- **Active mode:** Near me or Journeys caption + icon use accent; Menu is never a “live mode” — only pressed/open state while sheet is open  
- No fourth Help cog in chrome — Help lives under **Menu**  
- System Settings (clear data, About, Privacy) under **Menu**

### Labels (final copy)

| Control | Caption | Do not call it |
|--------|---------|----------------|
| Crosshair | **Near me** | Mode, Nearby, GPS, Location |
| Route (two nodes + path) | **Journeys** | Sheet title is also **Journeys** (not My Journeys) |
| Hamburger | **Menu** | Settings, More, Burger |

**Chrome + sheet:** both say **Journeys** (as shipped). “My Journeys” was considered for warmth but not used — keeps chrome and dialog aligned and avoids label crowding.

**Why “Near me” on the default tab is OK:** destination label — re-tap recenters; it does not mean “go somewhere else.”

---

## 4. Two live modes (main canvas)

### A. Nearby mode

**Entered by:** cold start (no journey / outside windows — see onboarding brief), or tap **Near me**.

**Shows:** ephemeral nearest-station board (per Nearby brief): soonest departure, other directions, no leave-home UI, not saved as a journey.

**Near me while already in Nearby:** request location again → update nearest station if changed → refresh times. Subtle feedback (e.g. brief refresh on the control), not a second wizard.

### B. Journey mode

**Entered by:** tap **Journeys**, or cold start when a saved journey’s **active hours** apply (and override rules as designed).

**Shows:** existing commute experience — leave / depart hero, platform, Then, journey switcher if ≥2, leave-buffer controls, etc.

**Manage journeys:** from Journey mode — **second tap on Journeys** chrome, or **Manage journeys** in the journey switcher when ≥2 configured journeys. Do not add a persistent route-line manage button (removed — it cluttered the canvas).

Minimum for v1 of this chrome:

- Tap **Journeys** with **≥1 configured journey** → show Journey mode for the appropriate journey (active window / last selected / only journey).  
- Access to full list/edit: **second tap Journeys** while in Journey mode, or **Manage journeys** from switcher (≥2 journeys).

**Recommended v1 simplicity (as built):**

1. Tap **Journeys** + has journeys → Journey mode immediately (smart pick via active hours / last selected / only journey).  
2. Tap **Journeys** + zero journeys → empty setup state (§5).  
3. **Manage / edit journeys** — no inline button under the route line. Use either:
   - **Tap Journeys again** while already in Journey mode → opens the **Journeys** dialog (list + edit). If no configured journey yet, template chips are shown.  
   - **Journey switcher** (visible when ≥2 configured journeys) → **Manage journeys** at the bottom of the dropdown.  
4. **Leave-home buffer** on the live leave card: sliders icon (top-right of leave card) opens journey detail focused on buffer — not only via the journeys editor.

---

## 5. Journey mode — empty (no journeys)

Replace vague “Set up your commute” with copy that matches the new IA:

**Hero / centre**

- Title: **No journeys yet**  
- Supporting: **Save a regular commute — station, direction, and when to leave.**  
- Primary CTA: **Add a journey**  
- Secondary (text): **Back to Near me** (optional if chrome already obvious)

Tapping **Add a journey** (empty-state CTA or **Add journey** in the list) → create flow:

- **Template chips:** Morning into town · Evening home · Custom  
- **Morning / Evening:** auto-pick route (nearest station + direction towards Perth, or Perth → homeward line), then a **3-step coach** inside the Journeys dialog:
  1. Route picked (changeable below)  
  2. Leave-home buffer explained (highlights slider)  
  3. Active from / until explained (highlights time fields; template preset times shown)  
- **Custom:** blank journey — user picks everything; no template coach  

Sheet title stays **Journeys** (not “My Journeys”). List heading copy: *Choose a journey to edit its station, direction, and timing.*

This is the spiritual successor of “Tap to get started,” not a dead end and not Menu.

---

## 6. Menu (hamburger)

Sheet / dialog contents (**as built**):

- One-liner: *Near me shows nearby trains. Journeys are saved commutes.*  
- **How it works** (opens help dialog)  
- **Add home screen widget** (Android app only — hidden on web)  
- **Reminders** — opens Reminders dialog (master toggle, get ready, pause, per-commute settings; Android app only)  
- **Remove ads** / **Restore purchase** (Android app only; one-time IAP)  
- **About** / **Privacy** (links)  
- **Clear all data** (footer)  

No journey list here — journeys live under **Journeys** chrome + dialog.

---

## 7. Active state + wizard pointing

- On Nearby mode: **Near me** control = selected (`aria-pressed`, accent)  
- On Journey mode (including empty setup): **Journeys** control = selected  
- Onboarding step 2 pulses/points at **Journeys** (icon + caption), CTA **Set up a journey** → empty Journey mode CTA or straight into create with template chips  
- **Template coach** (Morning / Evening only): separate 3-step wizard inside Journeys dialog while editing a new journey — does not replace Nearby onboarding coach  

---

## 8. App icon — train 20% larger

**Asset:** `public/icon.svg` (launcher / PWA icon), not the chrome glyphs.

**Status:** Done — train group uses `scale(1.2)` about centre `(256, 256)` (with slight vertical nudge in asset).

Scale the **train body + wheels** group to **120%** about the icon centre `(256, 256)`, keeping the teal rounded square full-bleed. Do not scale the background rect.

**Intent:** train reads larger on the home-screen glyph; wheels/body stay inside safe padding (~10–12% inset). If wheels clip after scale, nudge the group slightly up rather than shrinking below 120%.

Pseudo-structure for Jim:

```svg
<rect … /> <!-- unchanged -->
<g transform="translate(256 256) scale(1.2) translate(-256 -256)">
  <!-- existing train path + wheel circles -->
</g>
```

Chrome **Journeys** icon remains the route (nodes + path), not the train silhouette.

---

## 9. Acceptance criteria

1. Top chrome shows exactly three controls with captions: **Near me**, **Journeys**, **Menu**.  
2. No bottom navigation bar.  
3. **Near me** always enters/refreshes Nearby mode — never opens Journeys or Menu. Brief refresh animation on the control when re-tapping in Nearby.  
4. **Journeys** with ≥1 **configured** journey (station + direction set) enters Journey mode (commute UI).  
5. **Journeys** with 0 configured journeys shows empty setup state + **Add a journey** (not a blank board, not Menu).  
6. **Journeys** second tap while already in Journey mode opens the Journeys dialog (list / templates / detail).  
7. **Menu** holds Help, native-only extras (widget, leave reminders, ad-free), About/Privacy, and Clear all data — no journey list.  
8. Selected caption/icon reflects current live mode (Near me vs Journeys). Menu uses pressed/expanded only while open.  
9. App icon train artwork scaled **+20%** per §8.  
10. Behaviour matches Nearby-first onboarding (wizard after **populate**, not after first paint).  
11. Morning / Evening templates auto-fill route and run the 3-step template coach before save.  

---

## 10. Summary

Three top controls with words: **Near me · Journeys · Menu**.  
Default canvas is Nearby; **Near me** still means Nearby (recenter if you’re there).  
**Journeys** means commute mode — or the setup empty state if none exist. Second tap opens manage/edit.  
**Menu** is system/help/native extras, not journeys.  
Template create (Morning / Evening) auto-picks route and walks through buffer + active hours.  
App icon train is **+20%**. Don’t put this in a bottom bar.
