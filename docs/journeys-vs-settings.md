# Design doc: Journeys entry vs Settings

**For:** Historical context  
**Status:** **Superseded** — see `docs/chrome-modes-and-labels.md` (source of truth for shipped chrome)  
**App truth:** Journeys CRUD is under the **Journeys** chrome control + dialog; system prefs / stickiness / IAP live under **Menu**. There is **no** settings cog and **no** top-bar Help `?`.

---

## What this doc was for

Originally: split journey config out of a settings cog into its own entry, and keep Near me in chrome.

**That goal shipped**, then evolved:

| Old proposal (this doc) | Shipped |
| ----------------------- | ------- |
| Help · Near me · Journeys · Settings cog | **Near me · Journeys · Menu** (labels under icons) |
| No text labels in top bar | Labels **required** |
| First-run → auto journey detail | **Nearby-first** + floating coach (`docs/nearby-first-onboarding.md`) |
| Settings = cog | **Menu** hamburger |
| Journeys icon TBD | **Route** icon (two nodes + path), class `.route-icon` |

---

## Still true (keep)

- Journeys own station / direction / leave buffer / active hours / add-rename-delete  
- Clear all data, About, Privacy are **not** journey CRUD — they live in Menu  
- Leave-buffer edit from the live leave card opens Journeys detail (buffer focus)  
- Near me stays a first-class mode (not removed to “make room”)

---

## Do not implement from this file

Ignore chrome order, “no labels,” zigzag SVG variants, and first-run auto-open journey form in sections below if they still appear in git history — they are obsolete.

For current Menu contents, empty-state copy, second-tap Journeys → manage, templates, and acceptance criteria → **`docs/chrome-modes-and-labels.md`**.
