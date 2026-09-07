# Jim brief — "Time to station" slider vanishes once you're late; late copy gives no reason

**Lane:** bug-fix / product mode (CLAUDE.md "Bug-fix lane"). Authorises shared-UI changes in
`public/nearby-mode.js`, `public/app.js`, `public/index.html`, CSS, and a new QA script.
`tim-review: yes` — part 2 changes rider-facing copy, so the top-level session will hold the
merge for Tim after Mark passes it.

## Symptom (Tim, phone, 7 Sep 2026)

With a pinned train (route pin or Near me pin) the leave card shows the inline
"Time to station" slider and the "Remind me when to leave" toggle. As soon as the leave phase
becomes now / late / missed (card reads e.g. "You're 2 minutes late — leave now"), the slider and
toggle disappear. Two consequences:

1. **Rider is trapped.** Drag the slider *down* (say 15 → 8 min) and the pinned train can flip
   from "Leave in 4 minutes" to late; the slider vanishes, so the rider cannot drag it back up.
   The only way out is the edit button on the card, which opens the journey detail dialog, or
   unpinning.
2. **"You're late" gives no reason.** Pinning a train that departs in 12 min when time to
   station is 15 min immediately says "You're 3 minutes late — leave now" with nothing that
   explains it comes from the 15-minute walk setting. Tim wants the card to say why: the time
   to station versus minutes until the train.

## Where

`public/nearby-mode.js` `renderPinLeaveCardContent()` (~line 1032): `pastLeaveBy =
isLeavePhasePastLeaveBy(live.leavePhase)` hides `nearbyLeaveBeforeFieldEl` and
`nearbyNotifySectionEl` and toggles `nearby-pin-leave-footer--hide-only`. That was introduced
in the PR #246 era; check `git log -S` and `docs/jim-brief-nearby-pin-leave-by.md` /
`docs/jim-brief-widget-hide-leave-when-late.md` for the original intent before removing it —
the widget hiding "leave" when late is a separate, deliberate rule and must stay.

Copy lives in `public/app.js` `formatLeaveMessage()` (~2884), `formatLeaveCardSubline()`,
`formatLeaveCardTargetSubline()`, `formatLeaveCardLabel()` (~3440–3477). Timing fields come
from `getLiveTiming(next)` (`minutesUntilLeave`, `minutesLate`, `leavePhase`); the buffer is
`getEffectiveLeaveBeforeMinutes(journey)` / `getNearbyLeaveBeforeMinutes()`.

## Required behaviour

1. The inline "Time to station" slider stays visible and usable in every leave phase while a
   pin is showing the card (calm, soon, urgent, now, late, missed). Moving it back up must
   re-render the card to the non-late phase immediately (no waiting for the next fetch).
   The "Remind me when to leave" toggle may stay hidden when late if the original brief wanted
   that — say which you chose and why in the PR.
2. When the phase is late or missed, the card's subline includes the reason in one short line,
   e.g. `12 min to the train · 15 min to station` (exact wording is Jim's call, keep it under
   ~40 characters, no em-dash). The existing "You're N minutes late — leave now" headline stays.
   Apply the same reason line in the non-pinned journey leave card if it is trivial; otherwise
   pinned surfaces only and say so.
3. The "I've left" / "Next Train" actions and the widget's late behaviour are unchanged.
4. Layout does not jump: card height with slider + late actions must not push the hero off
   screen on a 375×812 viewport.

## Acceptance criteria

- A1: with a Near me pin and time-to-station N such that the pinned train is late, the slider
  is visible; dragging it below the threshold returns the card to "Leave in …" without a fetch.
- A2: same for a route pin (Routes tab).
- A3: late/missed subline contains both the minutes-to-train and the time-to-station values.
- A4: `qa/nearby-swipe-after-route-pin.mjs`, `qa/route-pin-after-nearby-pin.mjs`,
  `qa/pin-swipe-notify.mjs`, `qa/pin-behavior.mjs`, and any `qa/*widget*late*` script pass.
- A5: `node qa/run-all.mjs --smoke` green.

## QA

New script `qa/late-leave-slider-stays.mjs` covering A1–A3, modelled on
`qa/nearby-swipe-after-route-pin.mjs`; register it in the smoke tier of `qa/run-all.mjs`.
Port 3000 may be held by another process; use the dev-server helper's fallback rather than
killing anything.

## Delivery

Branch `late-leave-slider-stays`, commit, push, open a PR linking this brief with a
before/after description of the copy. Leave no background sleep/poll loops running.
