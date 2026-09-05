# Pickup after the 23:00 parallel-burst rate-limit kill (5 Sep 2026)

16 Jim/Nico subagents were launched in parallel around 23:00 on 5 Sep 2026 and all were killed
by an API rate limit within minutes. This is the state found on 6 Sep, and how to pick the work
back up safely.

## (a) State found

**Main checkout** (branch `london-se-nr-flip`, PR #270 open — untouched by this):
- Modified: `docs/expansion-tracker/lane-locks.json`, `docs/southwest-d1/jim-handoff.md`,
  `lib/cities/live-city-api.js`, `qa/run-all.mjs`; deleted `qa/southwest-planned-gate.mjs`.
- Untracked: all 7 `docs/jim-brief-*-flip.md` briefs, `lib/cities/southwest/dogfood-next-train.js`
  (267 lines), `qa/southwest-dogfood-gate.mjs`.
- **Southwest is the furthest along of anything from the burst** — a Jim run did the dogfood
  module, the `live-city-api.js` dispatch wiring, and the gate swap directly in the main checkout
  (not a worktree) before being killed. It looks like a near-complete flip follow-through pass,
  just uncommitted and unverified.

**Worktrees** (`.claude/worktrees/agent-*`, `git worktree list`):
| Worktree dir | Branch | Real work? |
|---|---|---|
| `agent-a2b81cc3802cfe82d` | `greater-manchester-flip-followthrough` | Yes — `lib/cities/greater-manchester/dogfood-next-train.js` (301 lines) written, but no dispatch wiring or gate yet (step 1 of 3 only). Healthy `node_modules` symlink + `.env.local` copy. |
| `agent-a826cfc6c048ff716` | `worktree-agent-a826cfc6c048ff716` | No — only the brief file present. `node_modules` "symlink" is corrupt (target path got mangled with a literal tab character, `...next-train-app\Users\tdrevProjects`). |
| `agent-a85a42a29c66bb8db` | `north-east-flip-followthrough` | No — only the brief file. Healthy `node_modules` symlink. |
| `agent-ab93caf9c604a2b51` | `glasgow-flip-followthrough` | No — only the brief file. `node_modules` symlink corrupt (same tab-mangled path). |
| `agent-aee6a2ffe3d21ec89` | `south-yorkshire-flip-followthrough` | No — only the brief file. `node_modules` symlink corrupt (same tab-mangled path). |

All five have a copied `.env.local`. `.claude/worktrees/agent-a49831b2b8440ccb4` is an **empty
leftover directory with no `.git`** — not a registered worktree (git commands run against it just
fall through to the main repo); ignore it, nothing to clean up there beyond the empty folder.

Cumbria and Edinburgh never launched (permission classifier) — only their brief files exist,
untracked, in the main checkout.

**Orphan branches** (`git branch --list 'worktree-agent-*'`, no worktree dir): `a0cb50d3e406f3ae4`,
`a22aa846d910ad484`, `aa3f7d004028c6cad`, `adf91bf8edac074d8`, `aef0b5c92c662331d` — no commits
ahead of `master`, nothing to recover. `a7b3000b755ab07e6` and `a7f24bddfaa6703de` do have commits,
but they're stale copies of already-merged PRs #238–#243 (UK ledger/registry sweeps merged the
morning of 5 Sep, hours before the burst) — unrelated leftovers, not burst work, safe to delete.

**Non-UK adapters** (Copenhagen, Boston, LA, BART, Chicago, Hamburg, Munich; Washington/Berlin never
launched): no corresponding worktrees or branches survive distinct from the orphan list above —
nothing recoverable; these need to restart from their D1 packs.

**Nico oracle reports**: `docs/{dublin,vienna,prague,lisbon,zurich}-d1/` do **not** exist — none of
the five Nico runs got far enough to write anything. Full restart for all five.

**Open PRs** (`gh pr list --state open`): #270 (london-se-national-rail, this branch), #268
(rest-of-scotland), #266 (rest-of-wales) — all pre-date the burst, unaffected.

## (b) Safe cleanup commands (not run — for you to review and run)

```bash
# Remove worktrees with no real work (brief-only or corrupt symlink)
git worktree remove .claude/worktrees/agent-a826cfc6c048ff716
git worktree remove .claude/worktrees/agent-a85a42a29c66bb8db
git worktree remove .claude/worktrees/agent-ab93caf9c604a2b51
git worktree remove .claude/worktrees/agent-aee6a2ffe3d21ec89

# Greater Manchester worktree: salvage the dogfood module first (copy it into the main
# checkout under lib/cities/greater-manchester/), THEN remove the worktree — don't remove-then-copy.

# Empty leftover directory (not a real worktree, just a stray folder)
rmdir .claude/worktrees/agent-a49831b2b8440ccb4   # or rm -rf if rmdir complains

# Delete the now-unused branches
git branch -D worktree-agent-a2b81cc3802cfe82d worktree-agent-a826cfc6c048ff716 \
  worktree-agent-a85a42a29c66bb8db worktree-agent-ab93caf9c604a2b51 \
  worktree-agent-aee6a2ffe3d21ec89 worktree-agent-a0cb50d3e406f3ae4 \
  worktree-agent-a22aa846d910ad484 worktree-agent-aa3f7d004028c6cad \
  worktree-agent-adf91bf8edac074d8 worktree-agent-aef0b5c92c662331d \
  worktree-agent-a7b3000b755ab07e6 worktree-agent-a7f24bddfaa6703de

git worktree prune
```

Do this cleanup *after* salvaging the Greater Manchester dogfood module and after the seven brief
files are committed (see below) — the brief files live in the main checkout already, not in any
worktree, so worktree removal won't touch them.

## (c) Recommended pickup order

**First, housekeeping (docs-only, no QA suite needed per CLAUDE.md):** commit the seven untracked
`docs/jim-brief-*-flip.md` files on a small docs branch and merge it — they're reference material
for the re-runs below and currently only exist as untracked files in one working tree.

**Then UK regions, one at a time, honouring the lane lock** (`node qa/lane-lock.mjs check
united-kingdom` before each Jim call — the top-level session's own check, not just Jim's internal
one). Suggested order, reasoning from the briefs:

1. **Southwest** — finish, don't restart. Already has dogfood module + dispatch wiring + gate in
   the main checkout; single-layer region (no second transit mode to reason about), simplest to
   close out. Run its own gate, then `qa/run-all.mjs --smoke`, then commit per Jim's "commit your
   own work" rule, before touching any other region.
2. **Greater Manchester** — salvage the existing 301-line dogfood module from its worktree first
   (don't discard real work), then finish steps 2–3 (dispatch wiring, gate swap). Two-layer region
   (National Rail + Metrolink) but the Metrolink gap is already a documented error-class case per
   the brief, so no new research needed.
3. **South Yorkshire** — two-layer (National Rail + Supertram), same documented-error-class
   pattern, no work started; brief is self-contained.
4. **North East** — two-layer, plus the region-name collision to avoid (`newcastle` AU is a
   separate live city) — worth doing before Glasgow/Edinburgh so that naming discipline is fresh.
5. **Glasgow** — two independent National Rail termini (no single hub) plus a Subway licence
   question Jim is told explicitly not to resolve; slightly more judgment-heavy than the above.
6. **Edinburgh** — never launched; do after Glasgow since the brief explicitly warns not to reuse
   Glasgow's two-terminus pattern (Edinburgh has one hub lock) — doing them back to back keeps
   that distinction in view.
7. **Cumbria** — never launched; no cross-region complications noted, fine to do last.

**Then non-UK wave-2 adapters, one country at a time** (each is its own country for lane-lock
purposes, so no cross-blocking, but keep Jim to one live invocation at a time regardless): restart
all seven from their existing D1 packs — Copenhagen, Boston, Los Angeles, BART, Chicago, Hamburg,
Munich — plus Washington and Berlin, which never launched. No ordering constraint between them;
pick by whichever D1 packs are freshest.

**Nico oracle reports** (Dublin, Vienna, Prague, Lisbon, Zürich) can be re-run any time, in
parallel with everything else — docs-only writes to `docs/<city>-d1/oracle-clash-report.md`, no
shared-file contention, no lane lock applies to Nico.

**General guidance for the re-run:** launch one Jim at a time this time, not 16 in parallel —
that's what caused the rate-limit kill. Nico/Luke restarts for non-UK cities can go in parallel
with each other and with the UK Jim work since they don't touch shared files, but keep it well
under the burst's concurrency.
