import fs from "fs";

const appPath = "public/app.js";
const lines = fs.readFileSync(appPath, "utf8").split(/\n/);

const removeRanges = [
  [2954, 2957],
  [2220, 2235],
  [2197, 2205],
  [2152, 2163],
  [2064, 2081],
  [1695, 1707],
  [1661, 1693],
  [1232, 1248],
  [1179, 1181],
  [1107, 1177],
  [961, 1105],
  [949, 960],
  [839, 858],
  [821, 837],
  [637, 649],
  [606, 635],
];

const removeSet = new Set();
for (const [start, end] of removeRanges) {
  for (let i = start; i <= end; i++) {
    removeSet.add(i - 1);
  }
}

const kept = lines.filter((_, index) => !removeSet.has(index));
fs.writeFileSync(appPath, kept.join("\n"));
console.log("Removed", removeSet.size, "lines; new count", kept.length);
