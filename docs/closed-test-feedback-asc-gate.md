# Closed-test feedback → ASC green light

**Purpose:** Know what “enough signal” means for paying Apple (~this weekend).  
**Not:** Production go / no-go (that’s `docs/go-no-go-metrics.md`).

---

## ASC green light (Tim, ~weekend 15–16 Aug)

Pay Apple Developer + stand up ASC shell if **all** of:

| # | Bar | How you know |
| - | --- | ------------ |
| 1 | **≥3** friends installed from Play closed track | They confirm, or Console installs |
| 2 | No **P0** (“app unusable / wrong times for my commute / crash on open”) from those installs | WhatsApp / email replies |
| 3 | At least **one** person used a **journey** or **Near me** and said times looked sane | One sentence is enough |
| 4 | You personally completed TESTING.md **22** (widget) + **17–19** (reminders) on a Play install — or consciously defer reminders and still ship ASC | Your notes |

**Red light (wait / fix first):** crash on open, systematically wrong leave-by for a real commute, billing/ads broken in a scary way, or zero installs by Sunday night.

**Yellow (pay ASC anyway, keep Android fix loop):** cosmetic UI nits, one flaky widget, “I don’t commute that line” — note for Jim, don’t hold Apple fee.

---

## Day-2 “reactions” ping (copy/paste)

Send ~24–48h after they install:

```
Quick check — how’s Next Train so far?

1) Did leave-by / Near me look right for a real trip?
2) Anything broken or confusing?
3) Did you try the home-screen widget? (optional)

One-liner is fine. Thanks —
Tim
```

Track replies in a notes file or spreadsheet columns: `name | installed? | journey? | times OK? | crash? | widget? | quote`

---

## Parallel work while Google / installs wait

| Who | Do now |
| --- | --- |
| **Tim** | Play Console: still in review? If available → blast `docs/closed-test-opt-in-blast.md` |
| **Tim** | On Play install: smoke money path (ad shows / remove-ads product visible) |
| **Tim** | Fill ~10 venue names in `docs/qr-guerrilla-kit.md` (contacts later) |
| **Simon** | Feature graphic concept + screenshot caption layouts (`docs/simon-brief-play-creative.md`) |
| **Ruth** | Final pass on Play long description if not done; hold send on press |
| **Dwayne** | Calendar hold for closed-build review once opt-in link exists |
| **Jim / PM** | CI already runs; analytics deferred; no new ship features until closed feedback |

---

## Change log

| Date | Note |
|------|------|
| 2026-08-12 | First ASC gate + Day-2 ping |
