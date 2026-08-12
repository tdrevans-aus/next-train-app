# Brief for Simon — Founding 200 Pro + widget unlock UI

**From:** Ruth (Marketing) + Tim  
**Date:** 11 Aug 2026  
**Priority:** High — **launch monetisation model** (hard to claw back after public)  
**Status:** Design delivered — `public/design/founding-pro.html` · Jim `docs/jim-brief-founding-pro.md`  
**For:** Simon (Design) → Jim implements  
**Related:** Play listing `docs/store-listing.md` · leave reminders / widget docs · IAP remove-ads path (will be renamed/expanded to **Pro**)

---

## Decision locked (design to this)

| Rule | Detail |
| --- | --- |
| **Free forever** | Full **app**: Near me, Journeys, leave-by in-app, with ads |
| **Pro (lifetime)** | **No ads** + **full-quality home-screen widget**. No subscription. |
| **Trial** | **30 days** full Pro from **first widget add** (preferred trigger). Then pay lifetime or widget locks; app stays free with ads. |
| **Founding cohort** | First **200** qualifying users get **Pro forever** (no pay). |
| **Qualifying** | Count toward 200 only if they **install and add the widget** (or Tim later confirms Journey-save — default = **widget add**). Not raw installs. |
| **Price** | Lifetime Pro — Tim locks number in Console (planning band **A$7.99–A$9.99**). Design with **A$X.XX** placeholder / “one-time”. |
| **Not in scope** | Crippled/slow free widget · subscriptions · ads inside the widget |

**Brand line:**  
*Free with ads. Full home-screen widget — Founding 200 free forever, then 30-day trial, then one-time Pro. No subscription.*

---

## Job of the design

1. Make **Founding 200** feel special (not spammy, not fake scarcity).  
2. Make **trial → pay** feel fair and calm (commute-critical tone).  
3. Make **widget locked** state clear and non-broken — never look like a buggy widget.  
4. One visual system for: founding unlock, trial countdown, paywall, restore.

---

## Surfaces to design

### 1) Founding 200 — in-app moment
When user is in the founding cohort and Pro unlocks free:

- Short coach / sheet: **You’re Founding 200** — Pro unlocked forever (widget + no ads).  
- Optional subtle badge in Menu: **Founding 200** (not on every main screen).  
- Primary CTA: **Add widget** / **Got it** (if widget not added yet).  
- No hard sell.

### 2) Trial started (non-founding)
On first widget add:

- Calm confirmation: **Pro trial — 30 days** (widget + no ads).  
- Secondary: what happens after (one-time Pro to keep widget).  
- Don’t block using the widget.

### 3) Trial ending (nudge window)
~**Day 21–25** soft nudge; firm at **day 30** (optional ~7-day grace if they reopen after expiry):

- Menu banner or one coach: **N days left** on Pro trial.  
- CTA: **Unlock Pro — one-time**.  
- Dismissible; never trap the commute flow on Near me / leave-by.

### 4) Paywall / upgrade (Menu + deep link from widget)
- Headline: keep the **full widget** + remove ads.  
- **One-time** price clear; **No subscription**.  
- Benefits as short bullets (widget, no ads).  
- **Restore purchases**.  
- Founding full? Show: *Founding 200 is full — trial / Pro for new users* only if relevant.

### 5) Widget locked state (after trial, not Pro)
**Critical.** Must read as intentional premium, not “Updating…” / broken.

- Clear title line: e.g. **Widget paused** / **Pro to continue**  
- One short line + **Unlock** (opens app paywall)  
- Same mist/teal language as app; no red error energy  
- Do **not** show fake times or a degraded leave-by

### 6) Menu — Pro status row
States to mock:

| State | Menu shows |
| --- | --- |
| Free (no trial) | Unlock Pro / Try widget (trial) |
| Founding 200 | Founding 200 · Pro |
| Trial active | Pro trial · N days left |
| Trial expired | Unlock Pro (one-time) |
| Pro paid | Pro · ads off |
| Restore | Always available near purchase |

### 7) Play listing / store creative (light)
- Update feature-graphic / screenshot caption only if we show Menu Pro or widget — **no** fake “100% free widget forever” once model ships.  
- Ruth will adjust `store-listing.md` copy; Simon: avoid store art that contradicts Pro.

---

## Visual / tone rules

- Calm, local, commute-critical — **not** aggressive dark-pattern timers.  
- Mist `#EEF3F2` + teal `#0B6E6A`; no purple IAP slop, no Transperth livery.  
- Founding: craft badge (small mark + “Founding 200”), not confetti explosion.  
- Trial countdown: readable, secondary — leave-by stays the hero in the app.

---

## Deliverables

1. **Flow frames** (Figma or HTML strip): founding unlock → trial start → trial nudge → paywall → widget locked → Pro active.  
2. **Widget locked** mock at true widget size (phone home context).  
3. **Menu status** variants (table above).  
4. **Copy deck** in-frame (Ruth can line-edit).  
5. Hand to Jim with states named for implementation.

**Out of scope for Simon:** Play Console product IDs, receipt logic, exact 200 counter — Tim/Jim.

---

## Acceptance

| Check | Pass |
| --- | --- |
| Founding feels rewarding, not gimmicky | **Y** — badge + short sheet |
| Trial expiry never looks like a crash/bug | **Y** — Widget paused |
| Paywall says one-time / no subscription | **Y** |
| Free app commute path not blocked by paywall | **Y** — nudge Menu-only / dismissible |
| Widget locked ≠ slow/minimal “free widget” | **Y** — no fake times |

---

## Slack-ready (Tim → Simon)

> Simon — launch monetisation locked for design: free app with ads; **full widget = Pro**; **Founding 200** get Pro forever; everyone else **30-day trial** then **lifetime one-time** (no sub). Brief: `docs/simon-brief-founding-pro.md`. Need flows + widget locked state + Menu Pro statuses. Calm tone — no crippled free widget.

**Simon done (11 Aug):** Open `public/design/founding-pro.html`. Jim brief ready. **Ruth:** trial locked at **30 days** (nudge ~21–25) — sync design copy if any frames still say 90.

---

## Change log

| Date | Note |
|------|------|
| 2026-08-11 | First brief — Founding 200 + trial → lifetime Pro |
| 2026-08-11 | Simon: HTML strip + Jim brief `jim-brief-founding-pro.md` |
| 2026-08-11 | Trial **90 → 30 days**; nudge ~day 21–25 |
