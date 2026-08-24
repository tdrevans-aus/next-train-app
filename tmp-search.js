import { execSync } from "child_process";
import fs from "fs";

const repo = "C:/Users/tdrev/Projects/Next Train App";
const patterns = [
  "isPinnedView",
  "skipTrains === 0",
  "getSkipTrains() === 0",
  "clearSkipState",
  "hero-pin-btn",
  "stopPropagation",
  "setPointerCapture",
  "initHeroSwipe",
  "toggleHeroPin",
];

for (const commit of ["d0ff074f", "f7bd7c23^", "HEAD"]) {
  console.log(`\n=== ${commit} public/app.js ===`);
  let text;
  try {
    text = execSync(`git show ${commit}:public/app.js`, { cwd: repo, encoding: "utf8" });
  } catch (e) {
    console.log("ERR", e.message);
    continue;
  }
  for (const p of patterns) {
    const count = (text.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (count) console.log(`${p}: ${count}`);
  }
}

console.log("\n=== HEAD public/train-navigation.js ===");
const nav = fs.readFileSync(`${repo}/public/train-navigation.js`, "utf8");
for (const p of patterns) {
  const count = (nav.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  if (count) console.log(`${p}: ${count}`);
}
