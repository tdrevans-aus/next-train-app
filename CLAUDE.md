# Next Train — repo notes for Claude

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
| Mark (QA) | the wired adapter + pack | a pass/fail note |
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

**Live-flip stays human.** No agent sets `status: "live"` in `lib/providers/registry.js` — that's
Tim's call, same as the tracker already insists ("Do not flip live" appears on multiple rows).

Full agent roster, model rationale, and wave-by-wave roadmap: see the Expansion Playbook artifact
(ask Tim for the link if you need it — it isn't checked into the repo).
