# Jim brief: Widget — hide leave after 1-minute grace (U-03 option 1)

**For:** Jim (implement) / already shipping in `CommuteSchedule`  
**From:** Simon (design) / Tim (product)  
**Status:** Locked + implemented (2026-08-10)  
**Related:** `android/.../CommuteSchedule.java` (`formatLeaveSecondary`), `docs/widget-homescreen.md`  
**Out of scope:** In-app leave card “I've left” / late nag; rolling Next Train; Then column

---

## Decision (locked — Tim)

**Option 1:** Keep **Leave in** / **Leave now**. Do **not** show **Leave N min ago**.

| Phase | Widget secondary |
|-------|------------------|
| Upcoming | `Leave in N min` |
| Leave-by / through **1 minute after** leave-by | `Leave now` |
| More than 1 minute after leave-by | **Hide** leave line (empty secondary) |

Next Train (left) unchanged — still the next departing train.

---

## Acceptance

1. 5+ min past leave-by → no leave secondary (not `Leave 5 min ago`).  
2. 1 min past leave-by → `Leave now` (urgent, not late-red).  
3. Before leave-by → `Leave in` unchanged.  
4. Rebuild APK to verify on device.
