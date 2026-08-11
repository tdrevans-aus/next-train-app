# Jim brief: Line direction groups (Tim approved — 10 Aug 2026)

**For:** Jim  
**From:** Tim (product)  
**Pattern:** `LINE_DESTINATION_GROUPS` in `lib/train-times.js` + `LINE_DIRECTION_GROUPS` in `public/app.js` — same as Whitfords/Yanchep.

---

## Approved groups

| Canonical (saved journey) | Also include trips to | Line / direction |
|---------------------------|------------------------|------------------|
| **Yanchep** | Whitfords, **Clarkson**, **Butler** | Yanchep line northbound |
| **Mandurah** | Cockburn Central (alias Cockburn) | Mandurah line southbound |
| **Fremantle** | Claremont | Fremantle line westbound |

Example config:

```javascript
const LINE_DESTINATION_GROUPS = {
  Yanchep: ["Yanchep", "Whitfords", "Clarkson", "Butler"],
  Mandurah: ["Mandurah", "Cockburn"],
  Fremantle: ["Fremantle", "Claremont"],
};
```

Mirror in `public/app.js`. Rebuild `public/train-times-bundle.js` (`npm run build:train-times`).

---

## Explicitly **do not** group

| Pair | Why |
|------|-----|
| **High Wycombe** + **Ellenbrook** | Branched lines — merge only at Bayswater; different directions of travel |
| **Byford** + **Cockburn Central** | Different lines (Armadale vs Mandurah) — only co-list at junction/Perth |
| **Claremont** + **High Wycombe** | Different lines at shared inner stations |

---

## QA

- `node qa/yanchep-whitfords-direction.mjs` (extend for Butler)
- `node qa/mandurah-cockburn-direction.mjs`
- New: Fremantle/Claremont + Butler in Yanchep group
- Manual: Shenton Park → **Fremantle** journey includes Claremont-short trains

---

## Slack

> Tim approved direction groups: Yanchep←Whitfords+Butler, Mandurah←Cockburn, Fremantle←Claremont. **Not** Ellenbrook+High Wycombe. Brief: `docs/jim-brief-direction-line-groups.md`
