# Jim brief — Routes editor: departure-station dropdown renders under "Trains to" (position: fixed inside a transformed dialog)

**Lane:** bug-fix / product mode. **Scope:** shared UI (public/station-combobox.js, public/styles/dialogs.css). **Date:** 27 Sep 2026. **tim-review:** no (layout only, no copy).

## Symptom (Tim, 27 Sep, Android debug build 3.0.4, screenshot in chat)
On the Routes editor, tapping "Departure station" ("Choose station") opens the search box ("Type a station") and list ~130 px lower and ~20 px to the right — directly under the "Trains to" label — so it reads as if the rider is choosing a "Trains to" value.

## Root cause (controller read, verify)
`syncDetailDropdownPosition()` in public/station-combobox.js (~line 396) sets `dropdown.style.position = "fixed"` with `top/left` from `trigger.getBoundingClientRect()` (viewport coordinates). The detail picker lives inside `#journeys-dialog` (or the settings detail view), whose CSS centres it with `transform: translate(...)` (public/styles/dialogs.css ~22/44/57/119/129). A `transform` on an ancestor makes `position: fixed` resolve against that ancestor, not the viewport, so the viewport-based top/left are offset by the dialog's own position — exactly the ~20 px x / ~130 px y shift in the screenshot. Desktop hides it because the dialog is centred differently or the offset is small.

## Fix
Pick one and say why: (a) portal the dropdown to `document.body` while open (move the node, keep listeners; restore on close) so `fixed` is truly viewport-relative; or (b) compute top/left relative to the transformed containing block (subtract the ancestor's bounding rect) — brittle; or (c) drop the transform centring on the dialog for a flex/grid centring that creates no containing block. (a) or (c) preferred. Keep the existing scroll/resize re-sync listeners working, keyboard open/close on Android (visualViewport) included.

## Acceptance
- Browser QA `qa/detail-picker-dropdown-position.mjs`: at 375×812 open Routes editor → tap Departure station → assert the dropdown's top is within 8 px of the trigger's bottom and left within 4 px of the trigger's left; repeat for the "Trains to" combobox; repeat after scrolling the dialog body; register in qa/run-all.mjs smoke tier.
- `node qa/run-all.mjs --smoke` (PLAIN) green (known local flake: no-live-feed-stops-gate — re-run alone if only failure).
- PR title: "Routes editor: station dropdown anchors to its own field (fixed-in-transform offset)".
