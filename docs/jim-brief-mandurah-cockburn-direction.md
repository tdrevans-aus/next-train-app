# Jim brief: Collapse Cockburn under Mandurah line (southbound)

**For:** Jim  
**From:** Tim (QA)  
**Priority:** Low–medium — same class as Whitfords/Yanchep  
**Related:** `docs/jim-brief-yanchep-whitfords-direction.md`, `LINE_DESTINATION_GROUPS`

---

## Problem

From **Bull Creek** (and other southbound stations on the Mandurah line), direction picker lists **Cockburn**, **Mandurah**, and **Perth** separately. Cockburn and Mandurah are the **same line** — some trains terminate at Cockburn Central, others run through to Mandurah.

Tim’s expectation: southbound direction should be **Mandurah** (line identity); **Perth** stays separate (northbound).

---

## Fix (shipped pattern)

| Canonical | Also include trips destined |
|-----------|-----------------------------|
| **Mandurah** | **Cockburn**, **Cockburn Central** (aliased → Cockburn) |

`LINE_DESTINATION_GROUPS` in `lib/train-times.js` + `LINE_DIRECTION_GROUPS` in `public/app.js`.

---

## QA

`node qa/mandurah-cockburn-direction.mjs` → PASS

Manual: Bull Creek journey → direction **Mandurah** only (no separate Cockburn); includes short Cockburn-terminated trains.
