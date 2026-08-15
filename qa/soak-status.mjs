/**
 * FB-33 soak health — summarize recent master CI + nightly runs.
 *
 * Usage: npm run soak:status
 * Requires: gh CLI authenticated for this repo.
 */
import { spawnSync } from "child_process";

const MASTER_PUSH_TARGET = 5;
const NIGHTLY_PASS_OF_LAST = 3;
const NIGHTLY_WINDOW = 5;

function ghJson(args) {
  const result = spawnSync("gh", args, { encoding: "utf8" });
  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || "gh failed").trim();
    throw new Error(msg);
  }
  return JSON.parse(result.stdout || "[]");
}

function summarizeRuns(runs, label) {
  const rows = runs.map((r) => ({
    conclusion: r.conclusion ?? "unknown",
    createdAt: r.createdAt,
    url: r.url,
  }));
  const pass = rows.filter((r) => r.conclusion === "success").length;
  console.log(`\n${label}: ${pass}/${rows.length} success`);
  for (const row of rows) {
    const mark = row.conclusion === "success" ? "✓" : "✗";
    console.log(`  ${mark} ${row.createdAt}  ${row.url}`);
  }
  return { pass, total: rows.length, rows };
}

function main() {
  console.log("FB-33 soak status\n");

  let masterRuns;
  let nightlyRuns;
  try {
    masterRuns = ghJson([
      "run",
      "list",
      "--workflow=ci.yml",
      "--branch=master",
      `--limit=${MASTER_PUSH_TARGET}`,
      "--json=conclusion,createdAt,url,event",
    ]);
    nightlyRuns = ghJson([
      "run",
      "list",
      "--workflow=qa-nightly.yml",
      `--limit=${NIGHTLY_WINDOW}`,
      "--json=conclusion,createdAt,url,event",
    ]);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    console.error("Install gh and run: gh auth login");
    process.exit(1);
  }

  const masterPush = masterRuns.filter((r) => r.event === "push");
  const master = summarizeRuns(
    masterPush.length ? masterPush : masterRuns,
    `Master CI (last ${MASTER_PUSH_TARGET} pushes)`
  );
  const nightly = summarizeRuns(nightlyRuns, `Nightly (last ${NIGHTLY_WINDOW} runs)`);

  const masterOk = master.pass === master.total && master.total >= MASTER_PUSH_TARGET;
  const nightlyOk = nightly.pass >= NIGHTLY_PASS_OF_LAST;

  console.log("\nSoak criteria:");
  console.log(
    `  Master release tier: ${masterOk ? "PASS" : "PENDING"} (${master.pass}/${MASTER_PUSH_TARGET} green)`
  );
  console.log(
    `  Nightly full tier:   ${nightlyOk ? "PASS" : "PENDING"} (${nightly.pass}/${NIGHTLY_PASS_OF_LAST} of ${NIGHTLY_WINDOW} green)`
  );

  if (masterOk && nightlyOk) {
    console.log("\nSoak gate: READY for 2.3.0 pre-release");
    process.exit(0);
  }

  console.log("\nSoak gate: still baking — see docs/fb-33-soak.md");
  process.exit(0);
}

main();
