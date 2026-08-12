# Design: Grocery store route app (AU)

**Working title:** *Aisle Order* (placeholder — rename later)  
**Author:** Simon (design) · for Tim  
**Date:** 12 Aug 2026  
**Status:** Concept design — not scheduled against Next Train  
**One-liner:** Paste a shopping list → match items to Coles or Woolworths products → sort by **store walk order** with **aisle labels**.

---

## 1. Job to be done

In the store, people waste time zig-zagging and backtracking. The list is in “brain order” (milk, wine, batteries…), not **floor order**.

**Outcome:** Open the phone once at the entrance; walk a sensible path; tick items; leave sooner.

Not: full meal planning, loyalty points, or replacing the retailer’s own app for checkout.

---

## 2. Core loop (the product)

```
List in → Match products → Resolve aisles for THIS store
    → Sort into route → Walk + tick → Done
```

If aisle resolution fails for an item: put it in **“Ask staff / end”** — never block the whole list.

---

## 3. Honest data reality (design constraint)

There is **no supported public “aisle API”** from Coles or Woolworths for third‑party apps.

What exists in the wild:

| Layer | Reality |
|-------|---------|
| Product search / price | Unofficial website/app JSON endpoints (change without notice; ToS risk) |
| Aisle / location | Often **store-specific**; Woolies’ own app shows aisle for many items; third parties scrape or crowdsource |
| Planogram / exact shelf | Not reliably available; don’t promise pin-point shelf in v1 |

**Design implication:** Treat retailers as **adapters** behind a stable app model (`ProductMatch`, `AisleRef`, `StoreLayout`). Ship with **degraded modes** so the app is still useful when data is thin.

### Recommended data strategy (phased)

1. **v1 — Match + category sort + optional aisle**  
   Match list lines → retailer products. Prefer any aisle string from product/detail when store is known. Else sort by **department/category order** for a chosen banner + “typical” layout template.
2. **v1.1 — Store pack**  
   User picks **banner + suburb/store**. Cache aisle hits per `storeId + stockcode`.
3. **v1.2 — Crowd correct**  
   “Wrong aisle?” → one-tap report → improves that store’s map for everyone (and for them next week).
4. **Later — Partner / licensed data** if a clean source appears; don’t block launch on it.

Do **not** market “official Coles/Woolies API” unless you have a contract.

---

## 4. Who it’s for

| Persona | Need |
|---------|------|
| **Primary:** Weekly shopper (1–2 banners) | Faster shop, less backtracking |
| Secondary: Couple sharing a list | Same route on two phones |
| Not v1: Professional personal shoppers, multi-store price arbitrage |

**Geography:** Australia first (Coles + Woolworths). IGA/ALDI later or never.

---

## 5. MVP scope (locked proposal)

### In

- Create list: paste text, one line per item, or type/add  
- Choose **Coles** or **Woolworths** (+ optional store)  
- Auto-match each line → product (confirm ambiguous matches)  
- Show **route list**: ordered sections by aisle / department  
- Each row: name, aisle (or “Unknown”), tick  
- Offline-ish: last resolved route cached for that trip  
- Wrong-aisle / skip / “can’t find”

### Out (v1)

- In-app checkout / pay  
- Live indoor maps / AR arrows  
- Price comparison as the hero (nice side dish later)  
- Recipe import, pantries, nutrition  
- Every independent grocer

---

## 6. Key screens

### 6.1 Home / trips

- Current trip (or “Start shop”)  
- Past lists  
- Default banner + home store (settings)

### 6.2 Build list

- Big paste field: “milk / sourdough / dishwashing tablets…”  
- Parse → editable chips/rows  
- **Resolve** CTA

### 6.3 Match review (critical)

For each line:

- Best match + price thumbnail (if available)  
- Alternatives  
- “Skip item” / “Generic only (no SKU)”

Ambiguity is where trust dies — **never silently pick the wrong brand**.

### 6.4 Route (hero screen — in-store)

One continuous scrolling list, **not** a dashboard:

- Sticky header: store name · progress `12/40` · “Entrance → …”  
- **Sections** = aisle or department (`Aisle 12 — Dairy`, `Aisle 3 — Bakery`)  
- Rows = item · optional size · tick  
- Unknowns grouped at **end** (or “Centre of store”)  
- Large tick targets (thumb, while holding a trolley)

Optional light mode: high contrast, huge type — supermarket lighting is awful.

### 6.5 Done

- Cleared count · duration (optional) · “Save as weekly list”

---

## 7. Route logic (product rules)

Goal: minimise **backtracking**, not perfect TSP on a CAD floorplan.

1. Map each matched item → `aisleId` or `departmentId`.  
2. Order sections by a **layout profile** for that store (or banner default):  
   e.g. Produce → Bakery → Meat → Dairy → Freezer → Pantry aisles low→high → Household → Checkout-adjacent.  
3. Within an aisle: keep retailer order if known; else alphabetical is fine.  
4. Cold chain: optional toggle **“Dairy/freezer last”** (default on) so ice cream doesn’t melt during a long shop.  
5. Unmatched / no aisle → final section **“Find or ask”**.

User can **pin** an aisle override (“This milk is always Aisle 14 here”) — stored per store.

---

## 8. UX principles

- **One job in-store:** the Route screen. Everything else is prep at home.  
- Prep can be slightly fussy (matching); in-store must be brainless.  
- Ticks are sacred — no modal spam while walking.  
- Assume one-handed use and bad Wi‑Fi in the freezer aisle (cache the route).

---

## 9. Architecture sketch

```
[Capacitor app]
   list parse → match UI → route UI
        │
        ▼
[API: Next.js / Vercel]
   /lists  /match  /route  /stores  /aisle-report
        │
        ├── Retailer adapters (Coles | Woolworths)  ← fragile, isolated
        ├── Layout profiles (per store or banner default)
        └── Aisle cache + crowd corrections (DB)
```

Same shape as Next Train: thin native shell, serious logic on server, adapters behind a stable contract.

**Privacy:** lists are sensitive (household habits). No selling list data. Clear retention. Optional local-only mode later.

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Retailer endpoint breaks | Adapter isolation; category fallback; don’t promise 100% aisle |
| Wrong match → angry user | Mandatory review for low-confidence matches |
| Store layouts differ | Store picker + crowd correct + local pin |
| ToS / blocking | Rate limits; cache; legal review before scale marketing |
| Competes with Woolies’ own aisle UI | Win on **multi-item route + paste list + cold-chain order**, not on being the catalogue |

---

## 11. Success metrics (closed test)

- Time from “Resolve” to usable Route &lt; 30s for a 25-item list  
- ≥70% of items have an aisle **or** confident department bucket  
- ≥50% of testers say “I’d use this next weekly shop”  
- Crash-free shop session (Sentry)  

---

## 12. Naming / brand direction (light)

Avoid generic “AI grocery assistant.” Name should sound like **movement through a store**:

- Aisle Order · Shop Path · Trolley Line · Listwalk  

Visual: supermarket realism (cool fluorescents, paper list energy) — not purple SaaS.

---

## 13. Suggested build order

1. List paste + parse + manual aisle tags (useful even with **zero** retailer API)  
2. Woolworths match adapter + aisle-when-present  
3. Route sort + in-store tick UI  
4. Coles adapter  
5. Store picker + aisle cache + wrong-aisle reports  

Ship a **manual-aisle** path first so Tim can dogfood the route UX at Coles this weekend without waiting on scrapers.

---

## 14. Decision asks for Tim

1. **Woolies-first, Coles-first, or both day one?**  
2. Is **crowd-sourced aisle** OK ethically/product-wise for v1.2?  
3. Phone only (Capacitor), or web trip-planner + phone route?  
4. Solo lists only, or shared list with partner in v1?

---

## One-sentence pitch

**Aisle Order turns a messy shopping list into a single aisle-by-aisle walk for your Coles or Woolworths — with honest fallbacks when the store won’t tell us where the biscuits live.**
