#!/usr/bin/env node
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zips = process.argv.slice(2);
if (zips.length !== 3) {
  console.error(
    "Usage: node scripts/trim-sydney-gtfs.mjs <sydneytrains.zip> <metro.zip> <nswtrains.zip>\n" +
      "Download these three with: node scripts/download-sydney-gtfs-zips.mjs <dir>"
  );
  process.exit(1);
}
const result = spawnSync("python", [join(root, "scripts/trim-sydney-gtfs.py"), ...zips], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
