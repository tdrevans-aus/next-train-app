# Next Train — repo notes for Claude

## QA suite tiers — default to smoke, never full

`qa/run-all.mjs` has three tiers; pick by occasion, not by thoroughness instinct:

- **Day-to-day / verifying a change:** `node qa/run-all.mjs --smoke` (~2–5 min). This already
  includes every city dogfood gate, line-map conformance, direction-match, and planned gate —
  it covers a normal data/adapter change completely.
- **Before merging or pushing a branch:** `node qa/run-all.mjs --release` (~5–8 min) — what CI
  runs on main.
- **Full (no flag) is not a working-session command.** It globs ~130 scripts, runs them
  sequentially, and has no per-script timeout outside CI, so one hung script stalls it forever.
  Reserve it for nightly/pre-release runs a human asked for by name.

A single city gate can also be run directly (`node qa/<city>-dogfood-gate.mjs`) for a tight loop.

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

**Start a fresh `Agent` call per city — never `SendMessage` to continue a prior one.** A new
`Agent` invocation has no memory of earlier runs; that's what keeps each city's context small and
cheap. The failure mode is treating one of these five as a standing conversation and feeding it
city after city via follow-up messages — don't do that, even though the tool allows it.

**One city per pipeline lane at a time.** Luke and Jim in particular touch shared files
(`lib/providers/`, `gtfs/realtime-board.js`) — running two cities through the same lane at once is
how merge conflicts and rework happen. See the tracker's own "finish started countries before new
ones" rule.

**Live-flip decision stays human; preparing it doesn't.** No agent merges or directly edits
`status: "live"` into `main`'s `lib/providers/registry.js` — same as the tracker already insists
("Do not flip live" appears on multiple rows). But once Mark's QA checklist is fully green for a
city, he opens a small PR that changes only that city's `status` line, with the checklist results
in the PR description. Tim's job is then to review and merge one line, not to hunt through
`registry.js` for which cities are ready and hand-edit it himself. This is still Tim's call —
Mark proposes, he decides — it just removes the manual busywork around the decision.

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
