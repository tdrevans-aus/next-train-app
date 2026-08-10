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
| `jim-brief-reminders-screen.md` | Unified Reminders dialog (shell / data) |
| `jim-brief-reminders-ux-redesign.md` | Reminders UX redesign (copy + layout) |
| `jim-brief-reminders-nudge-pause.md` | Nudge chips + timed Pause |
| `jim-brief-leave-reminder-schedule-debug.md` | `getSchedule()` readout |
| `jim-brief-stagger-stickiness-coaches.md` | Coach timing |
| `jim-brief-journey-detail-tighten-sticky.md` | Sticky footer + tighten |
| `jim-brief-journey-manage-entry.md` | Manage entry (superseded canvas link) |
| `jim-brief-journey-edit-icon.md` | Pencil by name (Option A) |
| `jim-brief-journey-name-on-detail.md` | Name field on journey detail |
| `jim-brief-active-days-display.md` | Active days gate display + reminders |
| `jim-brief-unsupported-region.md` | Block Near me when &gt;50 km |
| `jim-brief-widget-help-pin-first.md` | Widget help — pin-first copy |
| `jim-brief-widget-not-now-menu-hint.md` | Widget Not now → Menu hint |
| `jim-brief-widget-leave-late-copy.md` | Widget “Leave N min ago” |
| `jim-brief-leave-reminders-v2.md` | Scheduler (shipped) |
| `jim-brief-duplicate-morning-template.md` | Duplicate Morning wizard overlap |
| `jim-brief-other-directions-in-journey-mode.md` | Other directions in Journey mode |
| `jim-brief-open-bugs.md` | **Current open QA bugs (Tim → Jim batch)** |
