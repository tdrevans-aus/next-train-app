/**
 * Vancouver TransLink disclaimer is exact, prominent, and not copied onto other cities.
 * TfL stays “Powered by TfL Open Data.”
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DISCLAIMER =
  "Some of the data used in this product or service is provided by permission of TransLink. TransLink assumes no responsibility for the accuracy or currency of the Data used in this product or service.";
const TFL = "Powered by TfL Open Data";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const session = readFileSync(join(ROOT, "public/city-session.js"), "utf8");
assert(session.includes(DISCLAIMER), "city-session must contain the exact TransLink disclaimer");
assert(session.includes(TFL), "TfL line must stay Powered by TfL Open Data");
assert(
  session.includes('if (id === "vancouver")') && session.includes("VANCOUVER_TRANSLINK_DISCLAIMER"),
  "disclaimer must be gated to vancouver"
);

const goldCoast = readFileSync(join(ROOT, "lib/cities/gold-coast/README.md"), "utf8");
assert(!goldCoast.includes(DISCLAIMER), "Do not copy TransLink (Vancouver) disclaimer onto Gold Coast");

const perthProvider = readFileSync(join(ROOT, "lib/providers/perth.js"), "utf8");
assert(!perthProvider.includes(DISCLAIMER), "Do not copy the disclaimer onto Perth");

const about = readFileSync(join(ROOT, "public/about.html"), "utf8");
assert(about.includes(TFL), "About may keep the TfL line");
assert(!about.includes(DISCLAIMER), "Do not put the Vancouver disclaimer on the global About page");

const css = readFileSync(join(ROOT, "public/styles/hero.css"), "utf8");
assert(css.includes(".attribution.is-required"), "Vancouver disclaimer must use the required attribution class");
assert(/\.attribution\.is-required[\s\S]*?font-size:\s*0\.62rem/.test(css), "disclaimer type should stay small");
assert(/\.attribution\.is-required[\s\S]*?font-weight:\s*400/.test(css), "disclaimer must not be bold");

console.log("vancouver-attribution: ok (exact TransLink disclaimer, Vancouver-only, TfL unchanged)");
