# How Tim briefs Jim

## For Tim

When Simon finishes a design, he updates **`docs/jim-prompt-latest.md`** with Jim’s full instructions (Tim does not need to read it).

Simon gives Tim **one line** to copy into Jim’s chat — nothing else.

**Design handoff (Simon):**

```
Jim — go code docs/jim-prompt-latest.md
```

**QA bug batch (Tim):**

```
Jim — go docs/jim-brief-open-bugs.md
```

QA maintains the checklist in **`docs/jim-brief-open-bugs.md`** + **`qa/latest.md`**. When bugs are fixed and verified, update or archive the open-bugs brief.

If the file name changes, update the **Current line** below.

---

## For Simon (internal)

After each design:

1. Write or update **`docs/jim-prompt-latest.md`** — full task for Jim (brief paths, priority, scope, don’t-redo, out of scope). Include repo guardrails at the top of that file so Jim only needs one reference.
2. Update the **Current line** above if the path changes.
3. Tell Tim only: *“Paste this into Jim’s chat:”* + the one line. **Do not** paste the full Jim instructions into Tim’s chat.

Archive old prompts as `docs/jim-prompt-YYYY-MM-DD-short-name.md` if useful.

## Brief index

| Brief | Topic |
|-------|--------|
| `feature-backlog.md` | Future features (not current sprint) |
| `undecided-issues.md` | Open product forks (not briefed yet) |
| `jim-brief-reminders-screen.md` | Unified Reminders dialog (shell / data) |
| `jim-brief-reminders-ux-redesign.md` | Reminders UX redesign (copy + layout) |
| `jim-brief-reminders-nudge-pause.md` | Early Reminder chips + timed Pause |
| `jim-brief-reminders-no-master.md` | Drop master Reminders toggle (Option B) |
| `jim-brief-reminders-on-journey.md` | Reminder + usual time on journey; slim Menu Reminders (U-02 A) |
| `jim-brief-leave-reminder-schedule-debug.md` | `getSchedule()` readout |
| `jim-brief-stagger-stickiness-coaches.md` | Coach timing |
| `jim-brief-menu-layout.md` | Menu — promote Reminders, drop hint |
| `jim-brief-journey-detail-tighten-sticky.md` | Sticky footer + tighten |
| `jim-brief-journey-manage-entry.md` | Manage entry (superseded canvas link) |
| `jim-brief-journey-edit-icon.md` | Pencil by name (Option A) |
| `jim-brief-journey-name-on-detail.md` | Name field on journey detail |
| `jim-brief-active-days-display.md` | Active days gate display + reminders |
| `jim-brief-journey-overlap-friendly.md` | Overlap copy + Fix for me chip |
| `jim-brief-unsupported-region.md` | Block Near me when &gt;50 km |
| `jim-brief-widget-help-pin-first.md` | Widget help — pin-first copy |
| `jim-brief-widget-not-now-menu-hint.md` | Widget Not now → Menu hint |
| `jim-brief-widget-already-have.md` | Already have a widget — honesty + Add another |
| `jim-brief-widget-leave-late-copy.md` | ~~Leave N min ago~~ superseded |
| `jim-brief-widget-hide-leave-when-late.md` | Hide leave after 1-min grace (U-03) |
| `jim-brief-leave-reminders-v2.md` | Scheduler (shipped) |
| `jim-brief-duplicate-morning-template.md` | Duplicate Morning wizard overlap |
| `jim-brief-journey-cap.md` | 6 journey cap not enforced + Morning chip + cap hint |
| `jim-brief-template-wizard-z-index.md` | Wizard coach card under Active hours / Reminder highlight |
| `jim-brief-other-directions-in-journey-mode.md` | Other directions in Journey mode |
| `jim-brief-location-wait-ux.md` | Soften GPS waits — first open + Name-first Morning wizard |
| `jim-brief-template-wizard-skip.md` | Wizard: no scrim dismiss + Skip tour + edit name (U-04) |
| `jim-brief-journey-reminder-polish.md` | Reminder label, footer scroll, wizard step |
| `jim-brief-new-journey-show-now.md` | First Save of new journey → show it on main (U-05 B) |
| `jim-brief-custom-active-days-today.md` | Custom Active days = today’s weekday (U-06 A) |
| `jim-brief-outside-hours-nearby.md` | Outside Active hours → Near me (app + widget) |
| `jim-brief-station-typeahead.md` | Type-to-filter station picker (detail + Near me) |
| `jim-brief-widget-empty-leave-layout.md` | Widget 2×1 when leave hidden — no lonely Updated |
| `jim-brief-yanchep-whitfords-direction.md` | Whitfords → Yanchep line direction collapse |
| `jim-brief-open-bugs.md` | **Current open QA bugs (Tim → Jim batch)** |
| `simon-brief-security-hardening.md` | Pre-ship security locks (S-01→S-06) |
| `jim-brief-security-xss.md` | **S-01** Stop DOM XSS + URL station allowlist |
| `jim-brief-security-privacy-copy.md` | **S-02** Privacy / store honesty copy |
| `jim-brief-security-api-harden.md` | **S-03** API rate limit + station allowlist |
| `jim-brief-security-android-backup.md` | **S-04** `allowBackup=false` |
| `jim-brief-security-iap-accept.md` | **S-05** IAP client trust — docs only |
| `jim-brief-security-admob-ship-gate.md` | **S-06** AdMob test mode ship gate |
| `jim-brief-leave-by-preferred-gate.md` | **U-11 B + U-12.1** Leave By = target / swipe-chosen |
| `jim-brief-preferred-always-visible.md` | **U-13** Target train always visible + Preferred→Target |
