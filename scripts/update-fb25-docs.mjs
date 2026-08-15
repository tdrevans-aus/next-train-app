import fs from "fs";

const path = "docs/codebase-inventory.md";
let content = fs.readFileSync(path, "utf8");

const start = content.indexOf("### Phase 2");
const end = content.indexOf("### Phase 3");
if (start < 0 || end < 0) {
  throw new Error("Phase markers not found");
}

const replacement = `### Phase 2 - Extract modules from \`app.js\` (3-5 days, medium risk)

Do **one PR per module**; run full web QA each time.

**Architecture decision (FB-25, Aug 2026):** Option A - plain script files + \`window.nextTrain*\` globals, loaded in \`index.html\` before \`app.js\`. Shared state (\`settings\`, DOM refs, timers) stays in \`app.js\`; modules receive deps via \`init(deps)\`. Not esbuild bundle yet.

| # | Module | ~Lines | Depends on | Status |
|---|--------|--------|------------|--------|
| 2.1 | \`station-combobox.js\` | 470 | DOM root, \`formatStationLabel\` via deps | **Done** (Aug 2026) |
| 2.2 | \`journey-model.js\` | 485 | Settings normalize/migrate; station/direction via deps | **Done** (Aug 2026) |
| 2.3 | \`train-navigation.js\` | 400 | Pin, skip, swipe; \`render()\` pipeline | **Blocked** - coupled to display (~2244-3937) |
| 2.4 | \`nearby-mode.js\` | 1,400 | Geo, board, pin session | **Blocked** - geo + chrome + journey mode |
| 2.5 | \`template-wizard.js\` | 1,400 | Journey detail, coach DOM | **Blocked** - interleaved with detail form |
| 2.6 | \`journey-detail.js\` | 400 | Combobox, directions API | **Blocked** - overlaps wizard + reminders |

**Tooling:** Option A for now (no bundle). Revisit esbuild when 2.3+ unblocked.

`;

content = content.slice(0, start) + replacement + content.slice(end);
fs.writeFileSync(path, content);
console.log("Updated Phase 2 section");
