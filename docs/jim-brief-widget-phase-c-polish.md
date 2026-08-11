# Jim brief: Widget Phase C — trust polish

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P2** (after Phase A + B) → **Implemented** (2026-08-10)  
**Depends on:** Phase A + B briefs  
**Hub:** `docs/widget-redesign-v2.md` §10 Phase C  
**Out of scope:** Shipping dual-instance different journeys as default; user-facing debug in production Play build unless behind a quiet flag

---

## 1. Goal

Polish trust signals once bleeding (A) and advance reliability (B) are in. Don’t block A/B on this.

---

## 2. Work items

### C1 — Medium stale copy pass

On **medium+** only (Updated visible):

| State | Copy lean |
|-------|-----------|
| Fresh | `Updated just now` / `Updated Nm ago` (keep) |
| Stale / degraded | **Times may be out of date** (clear, calm — no Tap app) |
| Fetching | Don’t flash conflicting Updated if Fetching… already shows |

Align `docs/widget-homescreen.md` + medium layout with Phase A degraded wording (**Open app**).

### C2 — Optional debug freshness (Tim builds)

Quiet way for Tim to see why the widget looks wrong **without logcat**:

- e.g. long-press is unavailable on widgets → prefer **Menu → Help** or a `?widgetDebug=1` / existing test flag that shows last `refreshedAt`, updating flag, last error in a one-line in-app panel — **not** on the home-screen widget face for end users.  
- If too heavy, ship a **logcat tag** + TESTING.md recipe instead and note “debug panel deferred.”

Lean: **TESTING.md recipe + structured log lines** first; in-app panel only if cheap.

### C3 — Dual-instance journeys

**Do not build** multi-journey widget instances in this phase unless Tim re-asks after A/B feel solid.

Only: leave a short comment in `docs/widget-homescreen.md` / redesign hub — “nice later; v1 = one smart journey.”

If Tim explicitly wants a spike: one paragraph in the done report on Android limits + pin-another behaviour (already-have dialog) — no code.

---

## 3. Acceptance

1. Medium degraded/stale copy matches Phase A language.  
2. Tim can diagnose freshness via documented logs or small in-app debug.  
3. No dual-instance feature shipped in C.  
4. `npm run cap:sync` / APK as needed.

---

## 4. Summary for Jim

> Phase C (after A+B): medium stale copy polish; Tim-facing freshness debug (logs OK); **no** dual journey widgets yet. Hub: `docs/widget-redesign-v2.md`.
