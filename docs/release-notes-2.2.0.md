# Release notes — 2.2.0

**Version:** `2.2.0` · **versionCode** `11`  
**Features:** FB-14 (Near me pin + leave-by) · FB-20 (Journey pin + Target train face)  
**Audience:** Closed testers (Play Console), Mark regression, internal

---

## Play Console (paste)

```
2.2.0 (11) — Pin your train

Near me
• Pin any departure — it stays on screen until you unpin or the train leaves
• Leave-by card with Time to station slider (separate from journey settings)
• Notify me — optional leave reminder + live countdown for this pin only (off by default)
• Home-screen widget shows your pinned Near me train while the pin is active

My Journeys
• Your Target train is the default “pinned” face during active hours — not every earlier train on the line
• Pin another train for today only; your saved Target train is unchanged
• Quieter “Next · …” line when a sooner train exists but you’re pinned to a later one
• Next Train on the leave card moves your pin forward; swiping does not change the pin

Journey setup
• Nearest-station link is quieter — “Use nearest station” / “Use my current location” when you need it

Please try: pin in Near me, pin in a morning commute, check the widget matches the app, turn Notify me on once.

Report bugs to EvansAppStudio@gmail.com
```

---

## What’s new (detail)

### Near me pin

- Map-pin on the hero: outline = unpinned, filled = pinned.
- Swipe to browse trains; pin only changes when you tap pin (or use **Next Train** on the leave card).
- While pinned:
  - **Leave in** card and walk-time slider (**Time to station**, 1–30 min; remembered for Near me only).
  - **Notify me** toggle (compact row under the slider).
  - **Hide** dismisses the leave card until you unpin or pin again.
- **Notify me** off → on-screen leave-by only. **On** → leave-now ping + live countdown strip (after notification permission). Does **not** change journey Remind me / strip settings.
- Pin clears when you change station, leave Near me, or ~1 min after departure.
- **Widget** shows the pinned Near me train (+ leave-by) and overrides the journey face while the pin is holding.

### Journey pin

- With a **Target train** set, hero and widget default to that train (first at-or-after target), not every early departure on busy lines.
- Pin button on journey hero for a **today-only** override; saved Target train in settings is unchanged.
- **Leave by** follows today’s pin (target or override).
- Muted secondary line — **Next · time · platform** — only when true next ≠ pinned train.
- **Next Train** on the leave card advances the pin to the following train when you’re running late; **swiping does not** change the pin.
- Pin control shows whenever a configured journey is displaying a train.

### Widget

- Follows journey pin during active hours.
- Follows Near me pin when that pin is active (Near me wins over journey).

### Journey setup

- **Use nearest station** / **Use my current location** link is demoted — shown when the station field is empty or after a location error, not as a permanent row.

---

## Not in this release

- Route vs Commute split (FB-23)
- Menu Try Pro CTA (FB-13 — still hidden)
- Target flag icon (FB-17 — superseded by pin)

---

## Regression focus (Mark / QA)

See **TESTING.md §22** pin checklist:

| Area | Checks |
|------|--------|
| Near me pin | Pin / unpin, slider, Notify me grant/deny, Hide, widget match |
| Journey pin | Target default face, day override, secondary Next line, Next Train vs swipe |
| Widget | 2×1 + medium — no clipped clock or `Updated …` line |
| Unchanged | Journey Remind me, Live countdown on journeys, Target train in detail |

**Automated before upload:**

```bash
npm run test:pre-release
node qa/leave-by-preferred-gate.mjs
```

**Manual on device:** TESTING.md **§22** (full widget matrix + pin table).

---

## Related

- `docs/jim-brief-nearby-pin-leave-by.md`
- `docs/jim-brief-journey-pin-preferred-target.md`
- `docs/release-versioning.md`
