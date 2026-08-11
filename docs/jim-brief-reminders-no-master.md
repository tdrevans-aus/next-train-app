# Jim brief: Reminders — drop master toggle (Option B)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **supersedes** the visible master **Reminders** row in `docs/jim-brief-reminders-ux-redesign.md`  
**Related:** `public/leave-reminders.js`, `public/index.html` (`#reminders-dialog`), `docs/jim-brief-reminders-nudge-pause.md`  
**Out of scope:** Scheduler math, Usual train time / days / Active days, widget coach, Menu layout

---

## 1. Problem

Reminders dialog shows two near-identical controls:

- Top card: **Reminders** (master `enabled`)  
- Journey card: **Reminder** (`remindMe`)

Looks redundant (“funky”). Users don’t need a second global switch when journey Reminder already means “remind me for this commute.”

**More options / Pause** only appear when master is on — so with master off they vanish even if a journey Reminder is on, which deepens the confusion.

---

## 2. Decision (Option B)

**Remove the master Reminders row from the UI.**

- Journey **Reminder** toggles are the only on/off the user sees.  
- Turning **any** journey Reminder **on** → set native master `enabled = true` and request notification permission. If permission is **denied**, revert that Reminder to **off** (no orphan “on” without notifications).  
- Turning **all** journey Reminders **off** → set master `enabled = false`.  
- New Morning / Evening templates default **`remindMe: false`** — user opts in.  
- Do **not** show a separate **Turn on notifications** link; opting in on a journey is the path.  
- Keep `enabled` in the plugin / settings model — just don’t show a duplicate control.

Lead copy under the title stays:

> Get a notification when it’s time to leave for your train.

---

## 3. UX after change

```
Reminders
Get a notification when it’s time to leave for your train.

┌─────────────────────────────────────┐
│ Morning into town                   │
│ Warwick, towards Perth              │
│ Reminder                      [on]  │
│ ─────────────────────────────────── │
│ Usual train time          7:20 AM   │
└─────────────────────────────────────┘

▸ More options          ← when ≥1 journey Reminder is on
   Early Reminder …
   Pause reminders …

[ Done ]
```

No top master card.

### More options / Pause / Early Reminder

Show **More options** (collapsed by default) only when reminders are actually live: at least one journey Reminder is on **and** native `enabled` is true. Otherwise hide More options entirely (no Early Reminder / Pause).

Pause / Early Reminder behaviour and chips unchanged (`jim-brief-reminders-nudge-pause.md`).

### Empty / no journeys

Keep empty state: *Save a journey first…* + Journeys CTA. No master row there either.

### Permission

If notifications denied while any Reminder is on: keep **Turn on notifications** hint (existing). Turning a Reminder on should still trigger enable + permission flow as today when master was flipped on.

---

## 4. Sync rules (implement carefully)

| User action | Persist |
|-------------|---------|
| Journey Reminder → **on** | `remindMe: true` for that journey; `enabled: true` |
| Journey Reminder → **off** (others still on) | that journey `remindMe: false`; leave `enabled: true` |
| Last journey Reminder → **off** | that journey `remindMe: false`; `enabled: false`; clear/hide pause UI as today when disabled |
| Pause / Resume / Early Reminder | unchanged APIs |

On dialog open:

- If `enabled` is true but **no** journey has `remindMe` (stale): treat as off for UI — set `enabled: false` or leave data and show no More options; prefer **heal**: `enabled = any(remindMe)`.  
- If some `remindMe` true but `enabled` false (screenshot case): **heal on open or on save** → `enabled: true` so scheduling matches what the user sees.

---

## 5. Acceptance

1. No master **Reminders** toggle card in the dialog.  
2. Only journey **Reminder** switches control on/off.  
3. First journey Reminder on → notifications path enables (`enabled` true).  
4. All journey Reminders off → `enabled` false; More options hidden.  
5. With ≥1 Reminder on → **More options** visible (collapsed); Pause + **Early Reminder** inside.  
6. Lead + Usual train time + Done unchanged in meaning.  
7. `npm run cap:sync` after web changes.

---

## 6. Files (likely)

| File | Change |
|------|--------|
| `public/index.html` | Remove / hide `#leave-reminders-enabled` master card markup |
| `public/leave-reminders.js` | Derive `enabled` from journey Reminder toggles; More options gate on any `remindMe`; heal stale state |
| `public/styles.css` | Drop unused master-card spacing if orphaned |
| `TESTING.md` | Reminders: no master row; More options when a journey Reminder is on |

---

## 7. Summary for Jim

> Drop the top master **Reminders** toggle. Journey **Reminder** is the only switch: any on → `enabled` true; all off → `enabled` false. Show **More options** (Early Reminder / Pause) when at least one journey Reminder is on. Heal mismatched `enabled` vs `remindMe` on open/save.
