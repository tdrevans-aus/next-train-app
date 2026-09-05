# Next Train — repo notes for Claude

## QA suite tiers — default to smoke, never full

`qa/run-all.mjs` has three tiers; pick by occasion, not by thoroughness instinct:

- **No suite at all** for changes that no QA script exercises: docs (`docs/**`, `CLAUDE.md`),
  agent definitions (`.claude/**`), and static copy/markup with no script or data binding (e.g.
  a new help-dialog entry in `public/index.html`). The suite tests providers and boards, not
  prose — running it for these is ritual, not verification.
- **Day-to-day / verifying a code or data change:** `node qa/run-all.mjs --smoke` (~2–5 min). This already
  includes every city dogfood gate, line-map conformance, direction-match, and planned gate —
  it covers a normal data/adapter change completely.
- **Before merging or pushing a branch:** `node qa/run-all.mjs --release` (~5–8 min) — what CI
  runs on main.
- **Full (no flag) is not a working-session command.** It globs ~130 scripts, runs them
  sequentially, and has no per-script timeout outside CI, so one hung script stalls it forever.
  Reserve it for nightly/pre-release runs a human asked for by name.

A single city gate can also be run directly (`node qa/<city>-dogfood-gate.mjs`) for a tight loop.

## Board eligibility — the walk-up rule (adopted 30 Aug 2026)

What appears on a station board is governed by `docs/board-eligibility-rule.md`: a board must
show **every service a rider can walk up and board** (no compulsory reservation, no check-in
barrier) at an in-catalog station, and every excluded service needs a recorded verdict — silence
is a QA failure. Filter *stations into the app*, never trains off a board silently. Nico's
oracle reports must include a Board eligibility section; Mark gates flips on it. First audit
(AU/SE/NL): `docs/board-eligibility-audit-au-se-nl.md`.

## Expansion pipeline agents (Nico / Luke / Jim / Mark / Viv)

Five named agents run the city-expansion pipeline (see `docs/multi-city-provider-design.md`
and the tracker's Cities/Countries sheets). Their definitions, including pinned models, live in
`.claude/agents/*.md` — each is invoked with the `Agent` tool using its `subagent_type`
(`nico`, `luke`, `jim`, `mark`, `viv`).

**Files, not chat, between agents.** Each agent reads a specific input file and writes a specific
output file; that file *is* the handoff. Never paste one agent's conversation or summary into
another agent's prompt as "context." If a handoff needs more than what's in the file, the file is
incomplete — fix the file, don't relay the chat. Concretely:

| Agent | Reads | Writes |
|---|---|---|
| Nico (research) | a Cities row | `docs/<city>-d1/oracle-clash-report.md` |
| Luke (data pack) | that oracle report | `docs/<city>-d1/{hazard-pack,direction-model-memo}.md`, `published-network.json` |
| Jim (adapter) | that finished D1 pack | `lib/providers/<city>.js` + `registry.js` entry |
| Mark (QA) | the wired adapter + pack | a pass/fail note, or a one-line flip-PR when fully green |
| Viv (outreach) | a Blocked row | a draft in `docs/outreach-drafts/<city>.md`, for Tim to send |

None of the five have a tool that lets them message another agent directly — this is enforced in
their `.claude/agents/*.md` tool lists, not just written as a convention. The same tool lists mean
none of them can schedule their own re-run or escalate their own model tier either: model is
pinned in each definition file, so running a city on a stronger model (e.g. Opus for a hard one)
requires a deliberate top-level `Agent` call with a `model` override — never something an agent
does to itself mid-task.

**Country lane (added 30 Aug 2026).** For countries with a shared/national feed or overlapping
regions (UK, Sweden, NL — never AU/NZ/CA), a one-time country lane runs before that country's
first region — as a retrofit before the *next* region for countries already started. It's a Nico
invocation with a country-scoped brief, producing `docs/<country>-ledger.md` (provider decision,
stop ownership, national-service board-eligibility verdicts, coverage boundaries) per
`docs/country-lane.md`. Cross-region discoveries propagate to the ledger — never by backfilling
an earlier region's pack. Region lanes read the ledger where one exists; Mark gates on ledger
consistency. Lane status per country lives in the tracker's Countries sheet (`Country lane`
column).

**Start a fresh `Agent` call per city — never `SendMessage` to continue a prior one.** A new
`Agent` invocation has no memory of earlier runs; that's what keeps each city's context small and
cheap. The failure mode is treating one of these five as a standing conversation and feeding it
city after city via follow-up messages — don't do that, even though the tool allows it.

**One city per pipeline lane at a time — enforced, not just written down.** Luke and Jim in
particular touch shared files (`lib/providers/`, `gtfs/realtime-board.js`) — running two cities
through the same lane at once is how merge conflicts and rework happen. This actually happened for
Sweden wave 1 (PR #157, "sweden-wave1-rebuild"): overlapping Malmö/Uppsala branches produced a
branch conflict, a duplicate QA gate registration landed as a merge artifact, and unrelated cities
(Osaka, Hong Kong) needed follow-up fixes for stale cross-references — enough rework that Malmö and
Uppsala's adapters were rebuilt from scratch. `qa/lane-lock.mjs` exists so this is checked, not
remembered. **Since 5 Sep 2026 the lock is Jim's only**: Luke's whole write set is `docs/<city>-d1/`,
which no other lane touches, so Luke packing region N+1 while Jim wires region N is the intended
pipelining, not a collision. Jim runs `check <country>` before starting and `acquire <country>
<region> jim <branch>` before touching shared files, refusing to proceed if a different region in
the same country already holds the lock. The lock file (`docs/expansion-tracker/lane-locks.json`)
is local and gitignored — the committed copy only ever reached master after the guarded PR had
merged, so it protected nothing and cost a release PR per region. The lock releases itself: `check`,
`status`, and `acquire` look up the lock's branch with `gh` and drop it once that branch's PR has
merged, so no one runs `release` by hand after a merge. `node qa/lane-lock.mjs status` shows what's
currently locked. See the tracker's own "finish started countries before new ones" rule, which this
makes mechanical.

**The top-level session checks first — don't rely on Jim's own check.** Before any `Agent` call
with `subagent_type: jim`, run `node qa/lane-lock.mjs check <country>` yourself and report the
result before dispatching. The in-agent check in Jim's `.md` file is a backstop for when this is
missed, not the primary gate — by the time a subagent's own check would fire, you've already spent
the round-trip of starting it. Two back-to-back Jim calls for different regions of the same
country, fired before either subagent has run, would both pass their own checks and still collide —
the top-level check is what actually prevents that. If the check reports the country locked, stop
and tell the user rather than proceeding or queuing the call for later. Luke needs no check.

**Live flips are lazy consensus (since 5 Sep 2026).** No agent merges or directly edits
`status: "live"` into `main`'s `lib/providers/registry.js`. Once Mark's QA checklist is fully green
for a city, he opens a small PR that changes only that city's `status` line (plus the three
live-list additions), labelled `flip`, with the checklist results in the description.
`.github/workflows/flip-automerge.yml` runs hourly and merges any `flip` PR that has been open 12
hours, is green and mergeable, and carries no `hold` label, no human comment, and no review. Tim
keeps the veto — add `hold`, comment, or close the PR — and a bad flip is a one-line revert. The
top-level session still never merges a flip PR itself; it either waits for the window or asks Tim.
Before this, flip PRs sat about a day each waiting for a review that in practice was a
rubber-stamp, which was the single largest latency in the pipeline.

**CI shape (since 5 Sep 2026).** Only `web-qa` is a required check on master, and the ruleset no
longer requires a PR branch to be up to date with master (the strict policy made every merge
invalidate every other open PR, each needing another 7-minute run). The push-to-master release run
is the backstop for two PRs that pass separately but conflict semantically; if it goes red, fix
forward. Docs-only PRs (`docs/**`, `*.md`, `.claude/**`) short-circuit every CI job to a no-op
success, mirroring the "no suite at all" tier above.

Full agent roster, model rationale, and wave-by-wave roadmap: see the Expansion Playbook artifact —
<https://claude.ai/code/artifact/f1e97865-bafc-4197-9424-a8dfa4c09c8f> (owned by Tim; read it with
the `Artifact` tool, `action: "read"`). This is the pointer to it, kept current whenever the
playbook is revised (last synced: 29 Aug 2026, wave 0 in progress).

The source tracker it's built from — `next-train-expansion-tracker.xlsx` (Cities, Countries,
Burndown, Legend sheets) — is checked in as plain CSV at `docs/expansion-tracker/{cities,countries,
burndown,legend}.csv` (one file per sheet; binary `.xlsx` isn't committed) so it doesn't depend on
Tim re-uploading it. It's the row-level detail (per-city feed URLs, auth type, wave, owner,
skip-risk notes) behind the playbook's summary — check `cities.csv`'s `Wave`/`Status` columns for
the current, authoritative wave assignment before trusting the playbook's prose, which can lag it.
Re-sync these CSVs whenever Tim shares a newer export.
