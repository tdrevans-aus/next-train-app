# Moron’s guide: Crash → Sentry → GitHub → Cursor fixes it

**Goal:** A user’s app crashes. You don’t have to babysit. Sentry notices, opens a GitHub ticket, Cursor’s automation tries to fix it and open a PR. You only show up to merge / ship (or when it’s stuck).

**Time:** ~30–45 minutes the first time.  
**You need:** Sentry account (you have this), GitHub access to the Next Train repo, Cursor (cloud Automations).

---

## Picture the pipe

```
Phone crashes
    → Sentry records it
    → Sentry alert creates a GitHub issue
    → Cursor Automation wakes up
    → Agent investigates + opens a PR
    → You merge / upload to Play when ready
```

Email to you is optional. The **important** action is **Create a GitHub issue**, not “email Tim”.

---

## Part A — Connect Sentry to GitHub

1. Open Sentry → **Settings** (gear) → **Integrations**.
2. Find **GitHub** → **Install** / **Add**.
3. Log into GitHub if asked.
4. When it asks which repos: **pick the Next Train repo by name**.  
   Don’t rely on “all repos” if you can avoid it — be explicit.
5. Finish install. You should see GitHub as connected.

**Check it worked:** open any Sentry Issue → sidebar should offer something like **Link GitHub Issue** / create issue. If that exists, the integration is alive.

---

## Part B — Alert that wakes GitHub (not only “high priority”)

Your current alert (“high priority” → Email) is fine as a backup. You also need a **broader** rule for the agent.

1. Sentry → your **capacitor** (or next-train) project → **Alerts**.
2. **Create Alert** (or duplicate the existing one and edit).
3. **When:** something like **A new issue is created**  
   (wording varies — you want “new crash/error showed up”, not only “high priority”).
4. **Then (Actions):**
   - **Create a GitHub issue** → choose the Next Train repo  
   - Optional: **Email** yourself as well (FYI only)
5. Save.

**Moron check:** next time you (or an agent) fire a test crash, a **new GitHub issue** should appear in the repo within a minute or two. If only email fires, the GitHub action isn’t set.

---

## Part C — Cursor Automation (the “you fix it” bit)

1. In Cursor, open **Automations** (Agents Window / Automations UI — not a random chat if the editor won’t open).
2. **Create** a new automation. Rough settings:

| Field | What to put |
| --- | --- |
| **Name** | e.g. `Sentry crash → fix PR` |
| **Trigger** | GitHub issue opened (or labeled) in the Next Train repo — ideally only issues created by Sentry / with a `sentry` label if you add one |
| **Tools** | Repo access, ability to open PRs; add Sentry MCP later if you have it |
| **Instructions** | See paste block below |

3. Save / enable the automation.

### Paste into Instructions (edit names if needed)

> When a GitHub issue is opened from Sentry for the Next Train app:  
> 1. Read the issue body and any Sentry links/stack traces.  
> 2. Reproduce or reason about the failure in this repo (Capacitor Android + `public/` web assets + `/api`).  
> 3. Implement the smallest safe fix. Don’t expand scope.  
> 4. Open a pull request with a clear summary and test notes.  
> 5. Comment on the GitHub issue with the PR link.  
> 6. If you cannot fix (needs Play Console, secrets, product decision, or can’t reproduce), comment **BLOCKED:** and one sentence why — do not spam Tim otherwise.

---

## Part D — What *you* still do

| Happens | You |
| --- | --- |
| Crash + GitHub issue + green PR | Merge when you trust it; ship Play build if needed |
| Agent comments **BLOCKED** | Unblock (keys, decision, more info) |
| Holiday / asleep | Pipe still runs; PRs wait for you |

You are **not** in the “notice the crash” loop. You are in the “ship the fix” loop.

---

## Part E — Optional polish

- Add a Sentry alert filter so **test crashes** / debug messages don’t open GitHub issues (e.g. ignore message containing `test crash (debug)`).
- Keep **high priority → email** for phone buzz on nasty stuff.
- Turn **off** relying on email as the only signal.

---

## Broken? Quick triage

| Symptom | Likely fix |
| --- | --- |
| Crash in Sentry, no GitHub issue | Alert action missing GitHub, or GitHub integration not scoped to this repo |
| GitHub issue, Cursor does nothing | Automation off, wrong repo/trigger, or not watching “issue opened” |
| Agent opens junk PRs | Narrow trigger (Sentry label only) + tighten instructions |
| No crashes ever | Release build must include `sentryDsn` in `site-config.json` (you already did this) |

---

## One-line summary

**Sentry records. GitHub tickets. Cursor automation PRs. You merge.**  
Email is optional noise, not the workflow.
