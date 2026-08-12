import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const capConfigPath = path.join(root, "ios/App/App/capacitor.config.json");

if (!fs.existsSync(capConfigPath)) {
  console.warn("patch-ios-package-classlist: capacitor.config.json not found, skipping");
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(capConfigPath, "utf8"));
const classList = Array.isArray(config.packageClassList) ? [...config.packageClassList] : [];
if (!classList.includes("WidgetSyncPlugin")) {
  classList.push("WidgetSyncPlugin");
}
config.packageClassList = classList;
fs.writeFileSync(capConfigPath, `${JSON.stringify(config, null, "\t")}\n`);
console.log("patch-ios-package-classlist: ensured WidgetSyncPlugin is registered");
