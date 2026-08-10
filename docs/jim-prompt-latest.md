# Jim task prompt — latest from Simon

**Date:** 2026-08-10  
**For:** Jim (Tim sends: “Jim — go code docs/jim-prompt-latest.md”)

---

```
## Repo guardrails

- Capacitor web app in public/ + Android native in android/app/src/main/java/com/tdrevans/nexttrain/
- Briefs in docs/jim-brief-*.md are the spec. Don’t edit them unless Tim asks; flag gaps before guessing.
- Perth times: Australia/Perth.
- Don’t git commit or push unless Tim asks.
- When done: list files changed, how to test on device/emulator, anything blocked.

## Task — implement now (gaps from design audit)

### 1. Journey name on detail (P1) — Option B
Read and implement: docs/jim-brief-journey-name-on-detail.md
- Name text field on journey detail (not pencil-to-edit)
- Custom starts with empty name (not Journey N); Save fallback Station → direction
- Remove list “Rename” button — rename only via detail Name field

### 2. Widget help copy polish (P1)
Read and finish: docs/jim-brief-widget-help-pin-first.md
- Body must be only: “Add widget puts your next train on the home screen without opening the app.”
- Remove “Tap Add widget…” and leave-in / 2×1 size paragraph if still present

### 2b. Widget “Not now” → Menu hint (P1)
Read and implement: docs/jim-brief-widget-not-now-menu-hint.md
- Not now → toast “You can add a widget anytime from Menu” + brief Menu icon pulse

### 3. Unsupported region (P2 — after 1–2 or if Tim says go)
Read and implement: docs/jim-brief-unsupported-region.md
- If nearest station > 50 km: block Near me with “Perth rail only” empty state
- My Journeys still allowed

Stop after these unless Tim says continue.
```
