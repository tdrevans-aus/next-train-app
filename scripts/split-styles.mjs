/**
 * One-off splitter for FB-27 styles.css domain modules.
 * Usage: node scripts/split-styles.mjs
 */
import fs from "fs";

const src = fs.readFileSync("public/styles.css", "utf8").split(/\n/);

const chunks = [
  ["public/styles/base.css", 1, 314],
  ["public/styles/nearby.css", 315, 721],
  ["public/styles/hero.css", 722, 1571],
  ["public/styles/ads.css", 1572, 1992],
  ["public/styles/dialogs.css", 1993, 2977],
  ["public/styles/journey-detail.css", 2978, 4238],
  ["public/styles/pages.css", 4239, src.length],
];

fs.mkdirSync("public/styles", { recursive: true });

for (const [file, start, end] of chunks) {
  const body = src.slice(start - 1, end).join("\n").trimEnd();
  fs.writeFileSync(file, `${body}\n`);
  console.log(`Wrote ${file} (${end - start + 1} lines)`);
}

const imports = chunks
  .map(([file]) => `@import url("${file.replace("public/", "")}");`)
  .join("\n");

fs.writeFileSync("public/styles.css", `${imports}\n`);
console.log("Wrote public/styles.css (imports only)");
