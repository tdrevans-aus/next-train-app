import { readFileSync } from "fs";
import { spawn } from "child_process";

const text = readFileSync(".env.local", "utf8");
let best = "";
for (const line of text.split(/\r?\n/)) {
  const eq = line.indexOf("=");
  if (eq < 0) continue;
  const name = line.slice(0, eq).trim();
  if (name !== "TFNSW_API_KEY" && name !== "TFNSW_API_KEY") continue;
  let v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (v === "[SENSITIVE]" || v === "SENSITIVE") continue;
  if (v.length > best.length) best = v;
}
if (!best) {
  console.error("No usable TfNSW env value in .env.local (skipped stubs).");
  process.exit(2);
}
console.log("TfNSW env value length", best.length);
const child = spawn(
  process.execPath,
  ["qa/sydney-network-sweep.mjs", "--time=am-peak", "--day=weekday"],
  {
    env: { ...process.env, TFNSW_API_KEY: best },
    stdio: "inherit",
    cwd: process.cwd(),
  }
);
child.on("exit", (code) => process.exit(code ?? 1));
