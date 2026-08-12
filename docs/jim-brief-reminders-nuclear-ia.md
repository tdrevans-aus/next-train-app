# Jim brief: Reminders nuclear IA (shipped)

**For:** Jim / Tim  
**From:** Simon (design) / Tim (product)  
**Date:** 12 Aug 2026  
**Status:** Implemented in tree — no separate Reminder settings sheet  
**Supersedes:** empty Reminder settings polish; Menu → Reminder settings as a destination

---

## 1. Decision

Leave alerts are **journey-owned**. Menu only keeps a global **Pause**.

| Surface | Owns |
|--------|------|
| Journey detail → **Remind me** | Target train (required), optional **Leave countdown in notifications** |
| **Menu** | **Pause leave alerts** (only when ≥1 journey has Remind me on) |
| ~~Reminder settings~~ | **Deleted** |
| ~~Early Reminder~~ | **Removed from UI** (12 Aug) — leave ping fires at leave-by only |

Early Reminder native flag is forced off when journey remind extras sync. Strip starts at leave-by.

---

## 2. Acceptance

1. Menu has **no** “Reminder settings” row.  
2. Empty account: Menu does **not** show Pause block (nothing to pause).  
3. Journey with Remind me on → one optional toggle: **Leave countdown in notifications**.  
4. No Early Reminder controls on journey detail.  
4. Pause still cancels alarms until resume / expiry.  
5. Coach “Turn on” → Journeys (not a settings sheet).  
6. Help mentions journey Remind me + Menu Pause.

---

## 3. Non-goals (this pass)

- Per-journey Early offsets / per-journey strip  
- First-fire strip opt-in coach (can follow)  
- Two-screen journey detail split  
