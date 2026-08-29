# qa/repros — one-off bug reproductions

Scripts that reproduce a specific (usually long-fixed) bug. They are **not**
regression gates: `qa/run-all.mjs` only globs top-level `qa/*.mjs`, so nothing
in this folder runs in any suite tier. Run one directly when re-investigating
its bug:

```
node qa/repros/<name>.mjs
```

Exit-code convention: most scripts here exit 0 when the repro fires (bug
reproduced). Two are inverted — `custom-template-delay-repro.mjs` and
`done-double-tap-repro.mjs` exit **1 when behaviour is good** (the delay /
double-fire did not occur) and 0 when the bug reproduced. They carried a
`PASS* on exit 1` marker back when the full suite still ran them.

New repro scripts belong here, not in `qa/` root — a file at the root joins
the full suite automatically.
