const { readFileSync } = require("fs");
const { spawn } = require("child_process");

const text = readFileSync(".env.local", "utf8");
let value = "";
for (const line of text.split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  const n = line.slice(0, i).trim();
  if (n !== "AT_API_KEY") continue;
  value = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
if (!value || value === "[SENSITIVE]") {
  console.error("missing local AT env");
  process.exit(2);
}
console.log("adding sensitive env, vlen=" + value.length);

const child = spawn(
  "vercel",
  ["env", "add", "AT_API_KEY", "production,preview", "--sensitive", "--yes"],
  { stdio: ["pipe", "inherit", "inherit"], shell: true }
);
child.stdin.write(value);
child.stdin.end();
child.on("exit", (code) => process.exit(code ?? 1));
