/**
 * D-07 (docs/dwayne-security-review-play-3.0.0.md): the public site sent HSTS but no browser
 * defence-in-depth headers. This offline gate parses vercel.json (no deploy, no network) and
 * asserts:
 *   1. a header rule whose `source` matches every path EXCEPT /api/(.*) (Vercel headers merge
 *      by path — a bare "/(.*)" rule would additively apply to /api/* too, which must stay
 *      untouched) sets the four hard headers: X-Content-Type-Options, X-Frame-Options,
 *      Referrer-Policy, and a Content-Security-Policy-Report-Only (report-only, not enforcing —
 *      the app loads Google Fonts, AdSense/AdMob and Sentry, and an enforcing CSP that breaks
 *      those on launch week is worse than none).
 *   2. Permissions-Policy denies camera/microphone/payment but keeps geolocation=(self) (Near me).
 *   3. the existing /api/(.*) rule does NOT set X-Frame-Options or any CSP header.
 *
 * To see this gate fail: revert vercel.json's non-api headers block, or widen its `source` back
 * to a bare "/(.*)"  that also matches /api/*.
 *
 * Usage: node qa/security-headers-gate.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function fail(message) {
  console.error(`FAIL security-headers-gate: ${message}`);
  process.exit(1);
}

function run() {
  const vercelJsonPath = path.join(REPO_ROOT, "vercel.json");
  const config = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8"));
  const rules = Array.isArray(config.headers) ? config.headers : [];

  const apiRule = rules.find((r) => r.source === "/api/(.*)");
  if (!apiRule) {
    fail("no /api/(.*) header rule found — expected the existing CORS/cache rule to stay");
  }
  const apiKeys = new Set((apiRule.headers || []).map((h) => h.key));
  if (apiKeys.has("X-Frame-Options")) {
    fail("/api/(.*) rule sets X-Frame-Options — API behaviour must stay unchanged");
  }
  for (const key of apiKeys) {
    if (/^Content-Security-Policy/.test(key)) {
      fail(`/api/(.*) rule sets ${key} — API behaviour must stay unchanged`);
    }
  }

  // Must NOT be a bare "/(.*)" that would additively apply to /api/* too (Vercel merges
  // header rules that both match the same path — it does not let a more specific rule
  // suppress a broader one).
  const catchAllRule = rules.find(
    (r) => r.source !== "/api/(.*)" && typeof r.source === "string" && r !== apiRule
  );
  if (!catchAllRule) {
    fail("no non-api catch-all header rule found");
  }
  if (catchAllRule.source === "/(.*)") {
    fail(
      `catch-all rule source is a bare "/(.*)" (${catchAllRule.source}) — this also matches /api/* ` +
        `under Vercel's additive header-merge behaviour; scope it to exclude api/, e.g. "/((?!api/).*)"`
    );
  }

  const headerByKey = new Map((catchAllRule.headers || []).map((h) => [h.key, h.value]));

  const requiredExact = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
  for (const [key, expected] of Object.entries(requiredExact)) {
    const actual = headerByKey.get(key);
    if (actual !== expected) {
      fail(`catch-all rule ${key} = ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    }
  }

  const permissionsPolicy = headerByKey.get("Permissions-Policy") || "";
  if (!/camera=\(\)/.test(permissionsPolicy)) fail("Permissions-Policy does not deny camera");
  if (!/microphone=\(\)/.test(permissionsPolicy)) fail("Permissions-Policy does not deny microphone");
  if (!/payment=\(\)/.test(permissionsPolicy)) fail("Permissions-Policy does not deny payment");
  if (!/geolocation=\(self\)/.test(permissionsPolicy)) {
    fail("Permissions-Policy must keep geolocation=(self) for Near me");
  }

  const cspKey = [...headerByKey.keys()].find((k) => /^Content-Security-Policy/.test(k));
  if (!cspKey) {
    fail("no Content-Security-Policy* header present on the catch-all rule");
  }
  if (cspKey !== "Content-Security-Policy-Report-Only") {
    fail(
      `${cspKey} is an ENFORCING CSP — this must ship report-only first ` +
        `(Content-Security-Policy-Report-Only) given AdSense/AdMob/Sentry/inline scripts`
    );
  }
  const csp = headerByKey.get(cspKey) || "";
  if (!/script-src/.test(csp) || !/connect-src/.test(csp) || !/style-src/.test(csp)) {
    fail("CSP report-only value is missing expected directives (script-src/style-src/connect-src)");
  }

  console.log("PASS security-headers-gate: hard headers present on non-api paths, /api/(.*) unchanged");
}

run();
