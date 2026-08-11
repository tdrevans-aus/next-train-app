# Brief for Simon — Security hardening (pre-ship)

**From:** Tim / Dwayne (security review 2026-08-11)  
**For:** Simon (design out → then Jim briefs)  
**Priority:** High — clear before store / prod ship  
**Status:** **Locked 2026-08-11** — Jim briefs cut  
**Source:** Full codebase security review (web + Android + Vercel API). Dev/debug-only items are **out of this brief** — Tim will re-check those on a separate pre-ship pass.

---

## Locked decisions (S-01 → S-06)

| ID | Topic | Decision | Jim |
|----|--------|----------|-----|
| **S-01** | DOM XSS | **Change.** Never put user/API strings through `innerHTML` (use `textContent` / `createElement`). Share URLs **keep** auto-create journey behaviour, but **station must match `stations.json`** (normalize via existing helpers); invalid station/direction → **do not persist**, fall through to normal cold start. Direction from URL: persist only after allowlisted station; still render as text. | `docs/jim-brief-security-xss.md` |
| **S-02** | Privacy + store honesty | **Change.** Rewrite `privacy.html` (About already closer). Cover location, AdMob + AdSense, Play purchase, device storage (localStorage + Android prefs), hosting logs. Tim aligns Play Console Data safety to the same facts. | `docs/jim-brief-security-privacy-copy.md` |
| **S-03** | Public API | **A + C.** Soft rate-limit per IP + station allowlist before Transperth. **B deferred** — keep CORS `*` (Capacitor WebView hits `https://next-train-app.vercel.app` cross-origin). No auth / pinning. | `docs/jim-brief-security-api-harden.md` |
| **S-04** | Android backup | **A.** `android:allowBackup="false"`. No UX copy. | `docs/jim-brief-security-android-backup.md` |
| **S-05** | Ad-free trust | **Accept for v1.** Client Play query + local cache is fine; no server receipt verify. Keep launch/resume re-query. Document spoof risk. | `docs/jim-brief-security-iap-accept.md` (docs only) |
| **S-06** | AdMob test mode | **Ship gate.** Repo may keep `admobTestMode: true` for debug. **Release / prod must not serve test ads.** Jim: force test mode **off** when Android is a non-debug build; Tim: set `false` for production web deploy + checklist. | `docs/jim-brief-security-admob-ship-gate.md` |

### Tim product calls — all locked above (no open forks)

Nothing left for Tim to choose on S-01–S-06. Optional later: S-07 backlog.

### S-07 — Deferred (not briefed)

| ID | Item | Note |
|----|------|------|
| S-07a | CSP / security headers | Nice-to-have after XSS sinks fixed |
| S-07b | FileProvider path tighten | Capacitor default; unused |
| S-07c | `nexttrain://` hijack | Phishing-only; App Links later if needed |
| S-07d | Lock-screen notification content | Product-expected; leave |
| S-07e | Release minify / ProGuard | Hardening, not a vuln |

---

## What we needed from you (done)

Turn the findings into **locked decisions** and **`docs/jim-brief-*.md`** files by theme.

---

## Context (one paragraph)

Next Train is a Capacitor Android + static web app. Native side is in good shape (non-exported receivers, immutable PendingIntents, allowlisted `nexttrain://` hosts, fixed HTTPS API). The real work is **web XSS sinks**, **privacy/policy honesty**, **public API abuse**, and a few **Android / release hygiene** items. No accounts, no server secrets — trust boundary is the WebView + public Vercel `/api/*`.

---

## Workstreams (reference — locks above win)

### S-01 — Stop DOM XSS (P0)

**Problem:** Untrusted strings hit `innerHTML` (journey switcher ~1855; directions/errors ~4597–4609; station options ~4193–4199).

**Locked:** Allowlisted station on share URL; text-safe rendering everywhere user/API strings appear.

### S-02 — Privacy policy + store honesty (P0)

**Locked:** Copy in Jim privacy brief; About only if a line still contradicts.

### S-03 — Public API hardening (P0 / P1)

**Locked:** A + C; B keep `*`.

### S-04 — Android backup (P1)

**Locked:** `allowBackup="false"`.

### S-05 — Ad-free entitlement trust (P2)

**Locked:** Accept; document.

### S-06 — Release config (P0 ship gate)

**Locked:** Debug may test; release must not.

---

## Deliverable back to Tim

1. Locked table — **above**  
2. Jim briefs — six paths in table  
3. Paste into Jim’s chat: **`Jim — go code docs/jim-prompt-latest.md`**  
4. No open product forks on S-01–S-06  

---

## What already looks fine (don’t redesign)

- Non-exported leave/widget alarm receivers; `FLAG_IMMUTABLE` PendingIntents  
- Deep link host allowlist (`journey` / `nearby` / `home`)  
- Fixed HTTPS API base; no cleartext config  
- Location coords stay on-device (station name only to API)  
- No hardcoded API secrets / purchase keys in repo  
