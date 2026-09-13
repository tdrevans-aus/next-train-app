# Release versioning — Next Train

**Owner:** Tim  
**Purpose:** One standard for Play uploads, git tags, and team shorthand (Mark / Jim / testers).

We use **semantic versioning** (`versionName`) plus a monotonic **Play `versionCode`**. Do not use informal labels like “v9a” as store version names.

---

## Two numbers

| Field | Where | Rule |
|-------|--------|------|
| **`versionName`** | Users, release notes, git tags | Semver: `MAJOR.MINOR.PATCH` (e.g. `2.1.3`) |
| **`versionCode`** | Play Console only | Integer; **must increase** on every AAB upload |

Play ignores custom schemes like “v9a”. Testers see `versionName`; Play enforces `versionCode`.

---

## Semver rules

| Kind of change | Bump | Example |
|----------------|------|---------|
| Bug fixes only (tester hotfix) | **PATCH** | `2.1.2` → `2.1.3` |
| New features, same product generation | **MINOR** | `2.1.x` → `2.2.0` |
| Big milestone / breaking / “new era” | **MAJOR** | `2.x` → `3.0.0` |

**Patch** = fixes for what testers already have — no v-next backlog features.  
**Minor** = feature backlog drop (FB items, UX polish).  
**Major** = reserved (e.g. public launch, second city, breaking API) — see `docs/feature-backlog.md` FB-09/10 for **3.0.0** hygiene targets.

---

## Current line (Aug 2026)

| Release | `versionName` | `versionCode` | Git tag | Notes |
|---------|---------------|---------------|---------|--------|
| Shipped pin release | **2.2.0** | **11** | `v2.2.0` | Pin release (FB-14 / FB-20) |
| Reminders hotfix | **2.2.1** | **12** | `v2.2.1` | Reminders hotfix — `npm run test:patch-ship` |
| Shipped widget + pin | **2.3.0** | **13** | `v2.3.0` | Widget appearance (FB-40/42), **FB-26** pin contract |
| Shipped routes + journeys | **2.4.0** | **14** | `v2.4.0` | **FB-23** Route vs Journey; FB-24/27/42, FB-11 |
| Shipped re-upload | **2.4.1** | **15** | `v2.4.1` | 2.4.0 closed-test re-upload (Play versionCode bump) |
| Pin / widget QA | **2.5.0** | **16** | `v2.5.0` | Pin resolution parity, widget layout, pin-behavior QA |
| Play hygiene | **2.5.1** | **17** | `v2.5.1` | Drop `USE_EXACT_ALARM`; closed-test upload |
| Leave-now / on-the-way | **2.5.2** | **18** | `v2.5.2` | Leave-now alarm, cancel, on-the-way countdown |
| Closed line | **2.5.4** | **20** | — | Prior closed candidate |
| Shipped | **2.5.5** | **21** | `v2.5.5` | Target-train widget/Journeys face; reminders; pin preview |
| Shipped | **2.5.6** | **22** | — | Rotterdam RET metro tester-live; Near me Got it dismiss |
| Shipped | **2.5.7** | **23** | `v2.5.7` | Auckland tester-live; AU D1 packs; nearest hide when GPS is another region |
| **Public launch** | **3.0.0** | **24** | `v3.0.0` | 33 cities across AU/UK/SE/FI/NO; NZ/NL/Canada retired; London catalog coverage; Sydney City Circle; production sweep — see `docs/release-notes-3.0.0.md` |
| Security + consent fixes | **3.0.1** | **25** | `v3.0.1` | Fixes-only PATCH ahead of Play production submission: EU/UK ad consent, security hardening (release cleartext off, test deep link removed) — see `docs/release-notes-3.0.1.md` |

Update this table when you ship.

---

## Files to bump (every release)

Keep these in sync:

| File | Fields |
|------|--------|
| `android/app/build.gradle` | `versionCode`, `versionName` |
| `package.json` | `version` |
| `public/site-config.json` | `appVersion` |
| `public/site-config.example.json` | `appVersion` |

Then `npm run cap:sync` before Android release builds.

---

## Git branching

```
master     ← shippable; matches last Play upload (+ hotfixes merged here)
    │
    ├── git tag v2.1.2          ← snapshot testers have
    │
    ├── hotfix/2.1.3            ← from tag; fixes only → merge master → tag v2.1.3
    │
    └── develop (or v2.2)         ← feature work for 2.2.0
            └── feature/*         ← short-lived branches
```

| Work | Branch | Ship as |
|------|--------|---------|
| Tester bug fix | `hotfix/<versionName>` from release tag | Patch → `master` → tag → AAB |
| Backlog features | `develop` / `feature/*` | Minor when ready → `master` → tag → AAB |

After a hotfix merges to `master`, **cherry-pick** the fix onto `develop` if the same code is needed there. Do not merge a half-done feature branch into a hotfix.

---

## Play release notes (testers)

Short format:

```
2.1.3 (10) — bug fixes
- Fixed …
```

Use **`versionName (versionCode)`** so support can match Play Console and Sentry.

---

## Vercel / API

`master` deploys the web API. Prefer **backward-compatible** API changes while 2.1.x apps are in the field. Breaking changes ship with a **minor/major** app release or a versioned API path.

---

## Related

- `TESTING.md` — smoke / ship gate before upload
- `docs/feature-backlog.md` — what belongs in 2.2.0 vs later
- `docs/go-live-ops.md` — ops checklist
- `docs/aab-signing-closed-testing.md` — signed AAB upload (if present)
