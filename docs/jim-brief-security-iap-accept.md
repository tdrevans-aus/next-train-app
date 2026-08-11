# Jim brief: Security — ad-free IAP risk accept (S-05)

**For:** Jim (docs only — no feature work)  
**From:** Simon (design) / Tim (product)  
**Status:** Ready — **P2 accept for v1**  
**Related:** `docs/simon-brief-security-hardening.md` **S-05**; `docs/ad-free-purchase.md`; `public/ad-free-purchase.js`  
**Out of scope:** Server receipt verification; anti-tamper root detect; blocking ship on spoofed `localStorage`

---

## 1. Decision (locked)

**Accept as-is for v1:**

- Entitlement = Play Billing query on device + `localStorage` cache (`nextTrainAdFreeCache`).  
- Users who spoof the cache can hide ads until a successful store re-query says otherwise.  
- This is normal for offline-capable one-time IAP without a backend.  
- **Do not** build server-side receipt verify unless Tim reopens later.

---

## 2. What Jim does

1. Add a short **Risk accept (v1)** subsection to `docs/ad-free-purchase.md` stating the above in plain language.  
2. Confirm code already **re-queries Play on launch / resume** (`refreshEntitlement`) — do **not** remove that.  
3. **No** new purchase UX. Menu visibility work already shipped separately.

---

## 3. Acceptance

| Check | Pass |
|-------|------|
| `ad-free-purchase.md` documents client-side trust + spoof limit | Yes |
| Launch/resume still refreshes entitlement from Play when billing available | Unchanged |

---

## 4. Explicit non-goals

- No “always block ads until Play answers” if that reintroduces ad flash / broken offline for real buyers — keep optimistic cache for display, store wins when queried.
