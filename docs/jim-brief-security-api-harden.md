# Jim brief: Security — public API harden (S-03)

**For:** Jim (implement)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready to code — **P0 / P1 pre-ship**  
**Related:** `docs/simon-brief-security-hardening.md` **S-03**; `api/*.js`; `lib/api-cors.js`; `vercel.json`; `public/stations.json`  
**Out of scope:** User accounts / API keys; cert pinning; restricting CORS origins (locked keep `*`)

---

## 1. Decisions (locked)

| Option | Lock |
|--------|------|
| **A — Soft harden** | **Yes** — rate limit per client IP + keep short cache (`vercel.json` already has `s-maxage=15`) |
| **B — Origin allowlist** | **No for v1** — keep `Access-Control-Allow-Origin: *` (Capacitor WebView calls `https://next-train-app.vercel.app` cross-origin) |
| **C — Station allowlist** | **Yes** — reject unknown stations before calling Transperth |

Apply to all public handlers: `api/next-train.js`, `api/directions.js`, `api/destinations.js` (and any shared helper).

---

## 2. Station allowlist

1. Load the catalog from `public/stations.json` (or a shared module that reads that file once per cold start).  
2. Normalize inbound `station` the same way the app does (trim / `Stn` suffix helpers if already in `lib/train-times.js` — reuse, don’t fork rules).  
3. If not in catalog → **400** JSON `{ error: "Unknown station" }` (or equivalent clear message). **Do not** call upstream.  
4. Perth cluster behaviour already in `lib/train-times.js` must keep working for allowlisted cluster names.

Direction / destination strings: **no** full allowlist required for v1 (live set changes); station gate is the abuse brake.

---

## 3. Rate limit

**Goal:** blunt scrape / cost spikes, not perfect multi-region fairness.

Suggested defaults (tune if needed):

| Knob | Value |
|------|--------|
| Window | 1 minute sliding or fixed |
| Limit | **60** GET requests / IP / window across `/api/*` (shared counter OK) |
| Over limit | **429** `{ error: "Too many requests" }` + `Retry-After` if easy |

Implementation: in-process Map on the serverless isolate is **acceptable** for soft harden (resets per instance). Prefer a tiny shared helper e.g. `lib/api-rate-limit.js` + `lib/api-station-allowlist.js` so all three routes stay consistent.

Identify IP from `x-forwarded-for` (first hop) or Vercel’s documented header; fall back to `req.socket` / `"unknown"`.

CORS preflight `OPTIONS` should **not** burn the limit (or count lightly — prefer skip).

---

## 4. CORS

Keep `lib/api-cors.js` (and `vercel.json` CORS headers) as `*`. Do not “fix” this to an allowlist without Tim + Simon revisiting Capacitor.

---

## 5. Acceptance

| Check | Pass |
|-------|------|
| `GET /api/next-train?station=NotARealStn&direction=Perth` | 400, no upstream |
| `GET /api/next-train?station=Edgewater%20Stn&direction=Perth` | 200 (or existing upstream error only) |
| Burst > limit from one IP | 429 |
| App on device / emulator | Near me + journey fetch still work |
| Browser same-origin / Capacitor | No CORS regression |

Optional: unit-style test for allowlist helper; smoke via curl is enough if documented in the PR notes.

---

## 6. Deploy note

Tim must **deploy Vercel** for API changes to hit production (`next-train-app.vercel.app`). Local `dev-server.js` should get the same allowlist (and a simple rate limit if trivial) so QA matches.
