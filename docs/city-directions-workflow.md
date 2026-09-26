# Generating `public/city-directions/<city>.json` when the sandbox can't reach the feed

`public/city-directions/<city>.json` is built by `node scripts/write-city-directions.mjs
--only=<city>` against that city's live feed, and `qa/bundled-city-directions.mjs` requires the
file to exist for every live city. Claude sandboxes go through a proxy that many provider feeds
403 on, so a city can be otherwise flip-ready with no way to produce this file locally (first hit:
Copenhagen flip PR #454, branch `flip-copenhagen-live`). GitHub Actions runners aren't behind that
proxy and can reach the feeds directly.

## Usage

1. Push (or already have) the feature branch that needs the file, e.g. `flip-copenhagen-live`.
   Never target `main`/`master` — the workflow refuses it.
2. Actions tab -> **Write city-directions JSON** -> **Run workflow**.
   - `city`: the id passed as `scripts/write-city-directions.mjs --only=<city>` (e.g.
     `copenhagen`).
   - `branch`: the exact branch name from step 1.
3. The workflow checks out that branch, runs `npm ci`, generates the file, runs
   `qa/bundled-city-directions.mjs` to confirm it's usable, and — only if
   `public/city-directions/<city>.json` is the sole file that changed — commits it as
   `github-actions[bot]` and pushes back to the same branch. If anything else changed, or nothing
   changed, it does not commit.
4. **A push made with the workflow's own `GITHUB_TOKEN` does not trigger other workflows
   (including CI) on that branch.** After the bot's commit lands, either:
   - push any small commit to the branch yourself (even an empty `git commit --allow-empty`), or
   - dispatch `ci.yml` manually for that branch — it already supports `workflow_dispatch`.

## Secrets

The workflow passes through the `secrets.*` env vars that `lib/providers/registry.js` `envKeys`
lists across all cities (e.g. `NTA_API_KEY`, `VIC_OPENDATA_API_KEY`, the Trafiklab and Västtrafik
keys). A city whose provider doesn't need a given key simply ignores the unset/empty env var —
missing secrets for other cities are harmless.
