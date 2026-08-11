# Jim brief: Reminder controls back on journey setup (U-02 A)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **locked A**  
**Supersedes (partial):** Per-journey UI in `docs/jim-brief-reminders-screen.md` / UX redesign (journey cards on Reminders hub). Keep no-master heal from `docs/jim-brief-reminders-no-master.md`.  
**Related:** `public/leave-reminders.js`, `public/app.js` (journey detail Save), `public/index.html` (`#reminders-dialog`, `#settings-detail-view`)  
**Out of scope:** Changing scheduler math; reintroducing a master Reminders toggle; dual Early Reminder per journey

---

## 1. Decision (locked)

**Option A:** Per-journey **Reminder** + **Preferred train** live on **journey setup/detail**.  

**Menu → Reminder settings** stays, but only for **shared** controls:

- Schedule line (when a real next ping exists)  
- **Early Reminder**, **Pause reminders** (no More options accordion)  

No journey cards / per-journey toggles on the Reminders dialog.

---

## 2. Journey detail

Add a **Reminder** section (after **Timing** is fine) — **label / scroll / wizard** details locked in `docs/jim-brief-journey-reminder-polish.md` (one “Reminder” label; clear sticky footer; final wizard step).

```
Reminder                              [on/off]

When on:
  Preferred train           [ time  ✕ ]
  First train at or after this time.
```

Do **not** duplicate the word Reminder as both section title and toggle title.
| Control | Field | Notes |
|---------|-------|--------|
| **Reminder** | `remindMe` | Same switch pattern as today’s Reminders cards |
| **Preferred train** | `preferredTrainTime` | Required when Reminder on (block Save with clear error) |
| Hint | — | *First train at or after this time.* |

**Active days** stay under Timing (already shipped) — they still gate reminders + auto-show.

### Behaviour

- Toggle Reminder **on** → expand Preferred train; if empty, focus the time control; run existing permission / `enabled` heal (any journey Reminder on → native `enabled` true).  
- Toggle **off** → keep preferred time in storage; heal `enabled` false when all journeys off.  
- Save journey with Reminder on and no preferred time → blocked (same rule as today’s Reminders Done validation).  
- Do **not** put Early Reminder or Pause on the journey form.

---

## 3. Menu → Reminder settings

Title: **Reminder settings** (Menu link + dialog).

Remove journey CTAs / **Journeys** button from this dialog. Reminder on/off lives only on journey setup.

Keep (when ≥1 journey has Reminder on and native `enabled`):

- Lead: *Early Reminder and Pause apply to every journey with Reminder on.*  
- Schedule line (when a real next ping exists)  
- **Early Reminder** + **Pause reminders** — always visible (no **More options** accordion)

### Empty / quiet states

| State | UI |
|-------|-----|
| No journeys | *Save a journey in My Journeys, then turn Reminder on there.* |
| Journeys exist, none with Reminder on | *Turn Reminder on for a journey in My Journeys to get leave notifications.* |
| ≥1 Reminder on | Lead + schedule + Early Reminder + Pause |

No duplicate list of Morning / Evening cards. No **Journeys** button on this screen.

---

## 4. Coach / discovery

Leave Now coach **Turn on**:

- Prefer open **journey detail** for the active (or first configured) journey with Reminder section visible / highlighted once.  
- Fallback: open Journeys list if no journey exists.

Menu **Reminders** remains for Pause / Early Reminder after reminders are live.

---

## 5. Acceptance

1. Journey detail has **Reminder** + **Preferred train** (when on).  
2. Reminders dialog has **no** per-journey Reminder toggles.  
3. Early Reminder + Pause on Menu → Reminder settings (not buried under More options; no Journeys CTA).  
4. No master Reminders toggle.  
5. Heal: any Reminder on ↔ `enabled`; all off ↔ off; permission deny turns journey Reminder(s) off.  
6. Save blocked if Reminder on without preferred train.  
7. Coach Turn on lands on journey Reminder, not a journey-card hub.  
8. `npm run cap:sync` after web changes.

---

## 6. Files (likely)

| File | Change |
|------|--------|
| `public/index.html` | Reminder section on detail; strip commute list from `#reminders-dialog` |
| `public/app.js` | Read/write `remindMe` + preferred on detail Save / populate |
| `public/leave-reminders.js` | Slim dialog UI; coach deep-link; keep heal / Early Reminder + Pause |
| `public/styles.css` | Detail Reminder section; Reminder settings layout |
| `TESTING.md` | Reminders on journey; slim Menu → Reminder settings |
| `docs/undecided-issues.md` | U-02 → Resolved A |

---

## 7. Summary for Jim

> Locked **A**: move per-journey **Reminder** + **Preferred train** onto journey setup. Menu → **Reminder settings** = schedule + **Early Reminder** / **Pause** only (no journey cards, no Journeys button, no More options). Keep no-master heal. Coach Turn on → journey Reminder section.
