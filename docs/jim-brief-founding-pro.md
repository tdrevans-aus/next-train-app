# Jim brief: Founding 200 Pro + widget unlock

**For:** Jim (implement)  
**From:** Simon (design) / Tim + Ruth (model lock)  
**Date:** 11 Aug 2026  
**Status:** Ready to code — **after** Simon design strip review (Tim OK)  
**Design strip:** `public/design/founding-pro.html`  
**Product brief:** `docs/simon-brief-founding-pro.md`  
**Out of scope:** Exact Play product ID / price (Tim Console); server-side 200 counter details Tim owns; crippled free widget; subscriptions; ads in widget

---

## 1. Model (locked)

| Rule | Lock |
|------|------|
| Free app | Near me, Journeys, leave-by in-app — **with ads** |
| Pro | **No ads** + **full home-screen widget** · lifetime one-time · **no sub** |
| Trial | **30 days** full Pro from **first widget add** |
| Founding 200 | First **200** who **install + add widget** → Pro forever (no pay) |
| After trial | Widget → locked state; app stays free with ads |
| Price | Console lifetime SKU — UI shows Play price / `A$X.XX` placeholder until live |

Replace / expand today’s **Remove ads** IAP into **Pro** (same billing plumbing OK if Tim keeps one SKU that grants Pro).

---

## 2. Named states (implement exactly)

| State id | Meaning | UI |
|----------|---------|-----|
| `free_no_trial` | Never started trial / no widget yet | Menu CTA **Try the widget** |
| `founding` | In Founding 200 | Menu **Founding 200 · Pro**; badge optional |
| `founding_unlock` | One-shot sheet when founding grants | Design strip §1 |
| `trial_started` | Sheet on first widget add (non-founding) | Strip §2 |
| `trial_active` | Within 30 days | Menu **Pro trial · N days left** |
| `trial_nudge` | ~day **21–25** soft; firm lock at **day 30** (optional ~7-day grace on reopen) | Menu banner / dismissible coach |
| `trial_expired` | Trial over, not paid | Menu **Unlock Pro**; widget `widget_locked` |
| `pro_paid` | Purchased lifetime | Menu **Pro** · ads off |
| `paywall` | Purchase sheet | Strip §4 |
| `widget_locked` | Home widget face after expiry | Strip §5 — **not** error/stale |

Restore purchases always available near purchase CTAs.

---

## 3. Widget locked face

- Title: **Widget paused**  
- Body: **Your Pro trial ended. Unlock once to keep leave-by on your home screen.**  
- Chip: **Unlock Pro** → open app `paywall` (deep link)  
- Mist/teal; **no** fake departure times; **no** red; **no** “Updating…”  
- During trial / founding / pro_paid: existing full widget unchanged  

---

## 4. Copy (from design strip)

Use strings in `public/design/founding-pro.html` copy deck unless Ruth edits.  
Paywall must say **one-time** and **No subscription**.

---

## 5. Acceptance

| Check | Pass |
|-------|------|
| Founding sheet calm; Menu shows Founding 200 | |
| First widget add starts trial (non-founding) without blocking widget | |
| Day 21–25 nudge dismissible; commute screens not trapped; lock at day 30 | |
| Expired → widget paused face + Menu Unlock Pro | |
| Paywall: one-time, restore, benefits = widget + no ads | |
| Free in-app leave-by still works with ads after expiry | |
| No slow/minimal “free widget” with live times | |

---

## 6. Slack / Jim

> Jim — `docs/jim-brief-founding-pro.md` + mock `public/design/founding-pro.html`. Expand Remove-ads → **Pro** (widget + no ads). States named in brief. **Widget paused** face after trial — never look broken. Founding 200 forever; else **30-day** trial from widget add then one-time. No live flip of multi-city. Tim owns SKU/price/200 counter.

---

## Change log

| Date | Note |
|------|------|
| 2026-08-11 | First Jim brief (90-day trial) |
| 2026-08-11 | Trial **90 → 30 days**; nudge ~21–25 |
