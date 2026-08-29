# qa/tools — debug utilities

Interactive/diagnostic helpers (CDP probes, geolocation traces, live DevTools
watchers). Not tests: they have no pass/fail meaning, and `qa/run-all.mjs`
ignores this folder on purpose. Run directly, e.g.:

```
node qa/tools/devtools-probe.mjs
```

New probes and scratch diagnostics belong here, not in `qa/` root — a file at
the root joins the full suite automatically.
