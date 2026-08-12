# Brief for Simon — App icon (Play / launcher) round 2

**From:** Ruth (Marketing) + Tim  
**Date:** 11 Aug 2026  
**Priority:** High for Play listing (512×512 required)  
**Concepts rejected:** `store-assets/icon-concepts/` A–E + current `public/icon.svg` / `play-icon-512.png`  
**Preview:** `public/design/app-icon-pick.html`  
**Metaphor (Tim locked):** **train track** (rails / sleepers / vanishing rails)  
**Not this round:** door, clock, chevron, letter N, front-facing train bodies (train family shelved unless track fails)

---

## Verdict on round 1

Tim: **none of these.** Colour feels like a green mismatch; metaphors didn’t land.

| Issue | Why |
| --- | --- |
| **Solid `#0B6E6A` tile** | Accent hex as a full field reads **forest green** on the home screen. App UI is **mist** `#EEF3F2` + teal accents. Icon must match that. |
| **A — letter N** | Empty brand mark. |
| **B — clock + train car** | Busy; toy-train energy. |
| **C — signal bars** | Wrong category. |
| **D / current — clunky front/top train** | Awkward geometry; still “green brick.” |
| **E — “12 MIN”** | Widget, not brand. |

**Do not** reskin A–E. New colour system + Tim’s metaphor.

Ruth’s earlier leave-by abstracts (door / clock / chevron) — **Tim declined.**  
Train **or** track was on the table; Tim then locked **track**.

---

## Locked colour system (`public/styles.css`)

| Token | Hex | Use |
| --- | --- | --- |
| Mist ground | `#EEF3F2` | **Preferred icon background** |
| Mid mist | `#E2ECE9` | Soft depth only |
| Accent teal | `#0B6E6A` | Glyph |
| Accent strong | `#085A57` | Optional darker stroke |
| Soft wheel/light | `#D9E8E5` | Detail only |

**Hard rules**
- Mist tile + teal mark (not solid green/teal brick).
- No Transperth orange/livery, no purple, no black void, no grass green.
- Flat, calm, craft. Judge at 512 **and** ~48px on light + dark wallpaper.

---

## Metaphor — train track only (4–6 options)

Explore **track** geometry that reads at 48px:

1. **Rails + sleepers** (plan / top-down or slight angle)  
2. **Vanishing rails** (perspective “where you’re going”)  
3. **Single elegant track curve** or switch — only if it still says “railway” not “swoosh logo”  
4. Optional: **one hybrid** (tiny train above short track) — drop if muddy at 48px  

**Avoid:** barcode / equals-sign / Wi‑Fi look; Transperth livery; solid green brick; toy locomotive as the hero.

---

## Deliverables

1. Four to six track concepts (SVG 512×512) in `store-assets/icon-concepts-v2/`  
2. Show on `public/design/app-icon-pick.html`  
3. Winner → Play **512×512 PNG ≤1 MB** (+ adaptive layers if you can)

**Winner (locked):** **E3 Band** — mist `#EEF3F2` tile, teal diagonal track.

---

## Slack-ready (Tim → Simon)

> Simon — app icon locked: **train track** metaphor, mist `#EEF3F2` + teal `#0B6E6A` (no solid green tile). 4–6 track concepts (rails/sleepers, vanishing, maybe a curve). Brief: `docs/simon-brief-app-icon.md`. Preview: `public/design/app-icon-pick.html`. No trains-as-hero, no N / signal / 12 MIN.

---

## Change log

| Date | Note |
|------|------|
| 2026-08-11 | Round 2 brief after Tim reject |
| 2026-08-11 | Tim: train or track (not door/clock/chevron) |
| 2026-08-11 | Tim locks **track** |
| 2026-08-11 | Simon: B1–B6 in `store-assets/icon-concepts-v2/` + pick page live |
| 2026-08-11 | Tim: B1/B5/B6 out; iterate B2/B3/B4 — rails must **not** meet at top |
| 2026-08-11 | Simon: round 3 — C1–C10 (clock/track riffs, B2×B4, curves) |
| 2026-08-11 | Simon: rounds 4–5 — D set scrapped after render check; **E1–E10** live. Shortlist E8 / E4 / E3 / E2 |
| 2026-08-11 | **Tim locks E3 Band** → `public/icon.svg` + `play-icon-512.png` + Android mipmaps |
