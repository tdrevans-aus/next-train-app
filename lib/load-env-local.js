/**
 * Load `.env.local` into process.env when a key is unset.
 * Local dogfood only — never used on Vercel.
 */
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) {
    return;
  }
  const text = readFileSync(path, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq < 1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  const tfnsw = String(process.env.TFNSW_API_KEY || "").trim();
  const tfnswAlt = String(process.env.TFNSW_API_KEY || "").trim();
  if (!tfnsw && tfnswAlt) {
    process.env.TFNSW_API_KEY = tfnswAlt;
  }
  if (!tfnswAlt && tfnsw) {
    process.env.TFNSW_API_KEY = tfnsw;
  }
}
