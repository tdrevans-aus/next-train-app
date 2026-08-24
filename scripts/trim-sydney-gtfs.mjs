#!/usr/bin/env node
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zip = process.argv[2];
if (!zip) {
  console.error(
    "Usage: node scripts/trim-sydney-gtfs.mjs /path/to/full_greater_sydney_gtfs_static_0.zip"
  );
  process.exit(1);
}
const result = spawnSync("python", [join(root, "scripts/trim-sydney-gtfs.py"), zip], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
