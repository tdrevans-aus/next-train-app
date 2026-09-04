# Jim brief: Fix `/api/health` OOM — unpoison liveness (keep ≤12 functions)

**For:** Jim or Claude (implement)  
**From:** Nico (Expansion) / Tim (product go)  
**Date:** 4 Sep 2026  
**Priority:** **P0 before Play public** — UptimeRobot liveness is red / flaky while trains are fine  
**Status:** Ready to code  
**Related:** `api/health.js` · `lib/gtfs-refresh.js` · `vercel.json` · `docs/go-live-ops.md` · `docs/jim-brief-gtfs-data-platform-scale.md`

**Out of scope:** Moving Amsterdam/Rotterdam NL feed onto Hobby cron (already known OOM — stay manual). Play AAB / city flips / product UI. Upgrading to Vercel Pro unless Tim opts in.

**Estimate:** ≤ half day.

---

## 1. Problem

Production `GET https://next-train-app.vercel.app/api/health` repeatedly returns **500 `FUNCTION_INVOCATION_FAILED`**.

Vercel runtime errors on this route (last ~2 weeks):

| Error | Count (sample) | Meaning |
| --- | --- | --- |
| instance was killed because it ran out of available memory | 6+ | **OOM** — Out Of Memory; function exceeded RAM, Vercel killed it |
| Task timed out after 300 seconds | 1 | Cron-shaped work on the health function ran to `maxDuration` |

Meanwhile:

- `/api/ready` → **200** `{"ready":true,...}`
- `/api/next-train?...` → **200** with live times

So the **app is up**. The **liveness endpoint is poisoned**. UptimeRobot’s health monitor (keyword `"ok":true` on `/api/health`) pages falsely.

### Why

Hobby plan caps a deployment at **12 Serverless Functions**. Cron was bolted onto health to avoid a 13th file:

```js
// api/health.js — today
import { runGtfsRefresh } from "../lib/gtfs-refresh.js"; // static top-level import
```

`lib/gtfs-refresh.js` statically pulls `fflate`, five city trim scripts, Blob upload, and (on cron) multi‑MB GTFS zips. That load happens on **every cold start of `/api/health`**, including a plain GET that only needs `{ ok: true }`.

`vercel.json` already gives health `memory: 2048` and `maxDuration: 300` for cron — still not enough when the module graph is that heavy on a Hobby instance.

---

## 2. Function count (do not blow the cap)

As of 4 Sep 2026 master, `api/**/*.js` = **10** files:

`board`, `cities`, `city-stations`, `destinations`, `dev/board`, `directions`, `feedback`, `health`, `next-train`, `ready`.

**Headroom: 2** before hitting 12.

| Approach | Function count | Verdict |
| --- | --- | --- |
| **A. Dynamic import** (preferred) | stays **10** | Fix OOM on GET; no new function |
| **B. Dedicated cron route** | **11** | Also fine; clearer separation |
| New cron **plus** other new APIs | risk **12+** | Do not |

**Do not** add a dedicated cron file *and* another new API in the same PR without Tim’s OK on the count.

---

## 3. Locked decisions

| ID | Choice |
| --- | --- |
| **H1** | Plain `GET /api/health` must stay **cheap** — no GTFS download, no trim, no Blob, no heavy static imports. Target: cold start returns `{ ok: true, service, ts }` in well under a second at default memory. |
| **H2** | Prefer **Option A** (dynamic `import()`). Only use **Option B** if A is awkward or cron still OOMs the shared function after A. |
| **H3** | Cron schedule stays daily (`17 3 * * *` UTC in `vercel.json`) unless Tim changes it. Auth stays `Authorization: Bearer $CRON_SECRET` (Vercel cron only). |
| **H4** | Do not re-enable Amsterdam/Rotterdam in this refresh job (see `gtfs-data-platform-scale` brief). |
| **H5** | No product / city / Play changes in this PR. |

---

## 4. Option A — preferred: dynamic import (no new function)

### 4.1 `api/health.js`

1. **Remove** the top-level `import { runGtfsRefresh } from "../lib/gtfs-refresh.js"`.
2. Keep CORS + method guard + cheap JSON response for normal GET.
3. Inside the cron branch only:

```js
if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
  const { runGtfsRefresh } = await import("../lib/gtfs-refresh.js");
  const report = await runGtfsRefresh();
  // ... existing status/json logging
  return;
}
```

4. Keep `applyCors` as a light static import (or inline) — it must not pull GTFS.

### 4.2 `vercel.json`

- Leave cron path as `/api/health` for Option A.
- Keep `functions["api/health.js"].memory` / `maxDuration` **for now** so cron still has headroom when dynamically loaded.
- Optional follow-up (separate PR): after A is proven, try lowering default memory for non-cron if Vercel allows path-split config — **not required for launch**.

### 4.3 Acceptance (A)

- [ ] `GET /api/health` → **200** `{ "ok": true, ... }` on production after deploy (retry cold + warm).
- [ ] No OOM / `FUNCTION_INVOCATION_FAILED` on plain GET in Vercel logs for 24h.
- [ ] Cron still runs (check next scheduled fire or Tim trigger with `CRON_SECRET`); refresh report JSON shape unchanged.
- [ ] Still **10** serverless functions under `api/`.
- [ ] UptimeRobot health monitor can stay on `/api/health` with keyword `"ok":true` (Tim retargets if needed until deploy).

---

## 5. Option B — fallback: dedicated cron route (11 functions)

Only if A is insufficient.

1. Add `api/cron/gtfs-refresh.js` (or `api/gtfs-refresh.js`) that:
   - Rejects callers without `Authorization: Bearer $CRON_SECRET`
   - Calls `runGtfsRefresh()` (static import OK **here**)
   - Returns the same report JSON
2. Move `memory: 2048` / `maxDuration: 300` in `vercel.json` onto that path; **strip** heavy config from `api/health.js` (health back to default memory).
3. Point `crons[0].path` at the new route.
4. `api/health.js` becomes pure liveness again (no gtfs import at all).

**Count:** 10 → **11**. Still under 12.

### Acceptance (B)

Same as A, plus: cron hits the **new** path; health has **no** cron branch.

---

## 6. Interim ops (Tim, until PR ships)

Point UptimeRobot **liveness** at `/api/ready` (keyword `"ready":true`) **or** pause the health monitor so false pages stop. Keep the synthetic next-train monitor as-is. After Option A/B is live, move liveness back to `/api/health` if desired.

---

## 7. QA / verify

```bash
curl -sS https://next-train-app.vercel.app/api/health
# expect 200 {"ok":true,...}

curl -sS https://next-train-app.vercel.app/api/ready
# still 200 ready

# Cron (local/preview with secret — Tim/Jim only; never paste secret in chat):
# curl -sS -H "Authorization: Bearer $CRON_SECRET" https://…/api/health
```

Vercel → Project → Logs / Runtime Errors: filter `/api/health` — no new OOM after deploy.

---

## 8. Slack-ready

> Jim/Claude — `/api/health` OOMs because it statically imports `gtfs-refresh` (GTFS cron bolted on for the Hobby 12-function cap). We’re at **10/12** functions. Prefer **dynamic `import()` only in the cron auth branch** (stay at 10). Fallback: dedicated cron route → 11. Brief: `docs/jim-brief-health-cron-oom.md`. P0 before Play public so UptimeRobot stops lying.

---

## Change log

| Date | Note |
| --- | --- |
| 2026-09-04 | Brief created — Nico after production health 500 / Vercel OOM on `/api/health` |
