/**
 * Founding 200 claim counter — file-backed for local dev; Tim wires production persistence.
 * @see docs/jim-brief-founding-pro.md
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../data");
const DATA_PATH = join(DATA_DIR, "founding-claims.json");

const DEFAULT_MAX = Number(process.env.FOUNDING_PRO_MAX ?? 200);

function readCount() {
  if (existsSync(DATA_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(DATA_PATH, "utf8"));
      return Number(parsed.count) || 0;
    } catch {
      return Number(process.env.FOUNDING_CLAIMS_USED ?? 0);
    }
  }
  return Number(process.env.FOUNDING_CLAIMS_USED ?? 0);
}

function writeCount(count) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify({ count, updatedAt: new Date().toISOString() }));
}

export function getFoundingStatus(max = DEFAULT_MAX) {
  const count = readCount();
  const slotsRemaining = Math.max(0, max - count);
  return {
    max,
    claims: count,
    slotsRemaining,
    foundingFull: slotsRemaining <= 0,
  };
}

export function tryClaimFounding(max = DEFAULT_MAX) {
  const status = getFoundingStatus(max);
  if (status.foundingFull) {
    return { granted: false, ...status };
  }

  try {
    const next = status.claims + 1;
    writeCount(next);
    const slotsRemaining = Math.max(0, max - next);
    return {
      granted: true,
      max,
      claims: next,
      slotsRemaining,
      foundingFull: slotsRemaining <= 0,
    };
  } catch (error) {
    return {
      granted: false,
      ...status,
      error: error?.message ?? "counter_unavailable",
    };
  }
}
