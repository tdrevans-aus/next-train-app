# Design: Remove ad “Continue” gate

**For:** Jim (implement)  
**Status:** **Done / shipped** — verified: no `#consent-banner` / Continue gate in `public/`  
**Related:** `docs/ad-free-purchase.md`

---

## Decision

**Delete** the first-run sheet:

> “Ads support this app” → **Continue**

It must **not** show in any scenario (including first launch, web, or Android).

This is **not** Google UMP. UMP for EU/UK is out of scope unless Tim asks later.

---

## Required behaviour

1. If the user is **not** ad-free → load and show the banner as today (AdMob / AdSense / placeholder), **with no prior Continue prompt**.  
2. If the user **is** ad-free → show no ads (unchanged from ad-free brief).  
3. Remove related UI/code paths for that gate (`consent-banner` / `showAdNoticeBanner` / consent-before-load flow). Local “accepted” consent used only to unlock that sheet can go; don’t invent a replacement blocker.  
4. Keep Privacy / About disclosure that the free app may show ads.  
5. Keep Menu **Remove ads** + near-banner remove link per `docs/ad-free-purchase.md`.

---

## Acceptance

- Fresh install, not entitled: trains (or Nearby) appear with **no** Continue sheet; ad may appear in its slot when ready.  
- No code path still mounts `#consent-banner`.  
- Ad-free entitlement still suppresses ads completely.

---

## Summary for Jim

> Drop the “Ads support this app / Continue” gate entirely. Just show ads when the user isn’t ad-free.
