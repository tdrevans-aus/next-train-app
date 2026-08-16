/**
 * Play Console pre-upload sanity checks (no AAB build).
 * Usage: node qa/pre-upload-check.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PRIVACY_URL = "https://next-train-app.vercel.app/privacy.html";
const EXPECTED_APP_ID = "com.tdrevans.nexttrain";
const EXPECTED_IAP = "com.tdrevans.nexttrain.adfree";
const SYNC_HINT = "Run `npm run export:icon && npm run cap:sync` then re-run pre-upload.";

function readBuildGradle() {
  const gradlePath = path.join(ROOT, "android/app/build.gradle");
  const text = fs.readFileSync(gradlePath, "utf8");
  const applicationId = text.match(/applicationId\s+"([^"]+)"/)?.[1];
  const versionCode = Number(text.match(/versionCode\s+(\d+)/)?.[1]);
  const versionName = text.match(/versionName\s+"([^"]+)"/)?.[1];
  const minifyEnabled = /minifyEnabled\s+true/.test(text);
  const nativeSymbolsConfigured =
    /debugSymbolLevel/.test(text) && /SYMBOL_TABLE/.test(text);
  return {
    applicationId,
    versionCode,
    versionName,
    gradlePath,
    text,
    minifyEnabled,
    nativeSymbolsConfigured,
  };
}

function checkGlanceWidget() {
  const manifestPath = path.join(ROOT, "android/app/src/main/AndroidManifest.xml");
  const manifest = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, "utf8")
    : "";
  const hasGlanceReceiver = manifest.includes("NextTrainGlanceReceiver");
  const glanceWidgetPath = path.join(
    ROOT,
    "android/app/src/main/java/com/tdrevans/nexttrain/NextTrainGlanceWidget.kt"
  );
  const glanceHelperPath = path.join(
    ROOT,
    "android/app/src/main/java/com/tdrevans/nexttrain/WidgetGlanceHelper.kt"
  );
  const glanceFilesOk =
    fs.existsSync(glanceWidgetPath) && fs.existsSync(glanceHelperPath);
  return { hasGlanceReceiver, glanceFilesOk, glanceWidgetPath };
}

function readSiteConfig() {
  const configPath = path.join(ROOT, "public/site-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return {
    configPath,
    adFreeProductId: config.adFreeProductId,
    appVersionCode: Number(config.appVersionCode),
    appVersion: config.appVersion,
  };
}

function readSyncedAsset(relPath) {
  const assetPath = path.join(ROOT, "android/app/src/main/assets/public", relPath);
  if (!fs.existsSync(assetPath)) {
    return { assetPath, text: null };
  }
  return { assetPath, text: fs.readFileSync(assetPath, "utf8") };
}

function checkSyncedLocationGate() {
  const geo = readSyncedAsset("geo-bundle.js");
  const app = readSyncedAsset("app.js");
  const geoOk =
    geo.text != null && geo.text.includes("ensureLocationPermission");
  const appOk =
    app.text != null &&
    app.text.includes("enterNearbyMode") &&
    app.text.includes("ensureLocationPermission");
  return {
    geoOk,
    appOk,
    geoPath: geo.assetPath,
    appPath: app.assetPath,
  };
}

function checkLauncherIconGate() {
  const bgPath = path.join(
    ROOT,
    "android/app/src/main/res/values/ic_launcher_background.xml"
  );
  const bgText = fs.existsSync(bgPath) ? fs.readFileSync(bgPath, "utf8") : "";
  const bgOk = /#eef3f2/i.test(bgText);

  const mdpiFg = path.join(
    ROOT,
    "android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png"
  );
  const xxxhdpiFg = path.join(
    ROOT,
    "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png"
  );
  const mipmapsOk = fs.existsSync(mdpiFg) && fs.existsSync(xxxhdpiFg);

  return { bgOk, mipmapsOk, bgPath, mdpiFg, xxxhdpiFg };
}

async function checkPrivacyUrl() {
  const res = await fetch(PRIVACY_URL, { redirect: "follow" });
  const body = await res.text();
  const ok = res.ok && body.length > 200;
  return { ok, status: res.status, hasDate: body.includes("August 2026") };
}

async function main() {
  const results = [];
  const gradle = readBuildGradle();
  const site = readSiteConfig();
  const privacy = await checkPrivacyUrl();
  const locationGate = checkSyncedLocationGate();
  const iconGate = checkLauncherIconGate();
  const glanceGate = checkGlanceWidget();

  results.push({
    check: "native debug symbols (debugSymbolLevel SYMBOL_TABLE)",
    ok: gradle.nativeSymbolsConfigured,
    detail: gradle.gradlePath,
    hint: "Add ndk { debugSymbolLevel 'SYMBOL_TABLE' } to release buildType — see docs/jim-brief-play-hygiene.md §3",
  });

  results.push({
    check: "minify / R8 off for v3 public",
    ok: !gradle.minifyEnabled,
    detail: gradle.minifyEnabled ? "minifyEnabled true" : "minifyEnabled false",
    hint: "mapping.txt required — see docs/jim-brief-play-hygiene.md §4",
  });

  results.push({
    check: "applicationId",
    ok: gradle.applicationId === EXPECTED_APP_ID,
    detail: gradle.applicationId,
  });

  results.push({
    check: "versionCode (gradle)",
    ok: Number.isFinite(gradle.versionCode) && gradle.versionCode >= 1,
    detail: `${gradle.versionName} (${gradle.versionCode})`,
  });

  results.push({
    check: "versionCode matches site-config",
    ok:
      Number.isFinite(gradle.versionCode) &&
      Number.isFinite(site.appVersionCode) &&
      gradle.versionCode === site.appVersionCode,
    detail: `gradle ${gradle.versionCode} vs site-config ${site.appVersionCode}`,
  });

  results.push({
    check: "IAP product id",
    ok: site.adFreeProductId === EXPECTED_IAP,
    detail: site.adFreeProductId,
  });

  results.push({
    check: "privacy URL",
    ok: privacy.ok,
    detail: `${PRIVACY_URL} → HTTP ${privacy.status}`,
  });

  results.push({
    check: "synced geo-bundle ensureLocationPermission",
    ok: locationGate.geoOk,
    detail: locationGate.geoPath,
    hint: SYNC_HINT,
  });

  results.push({
    check: "synced app.js enterNearbyMode permission hook",
    ok: locationGate.appOk,
    detail: locationGate.appPath,
    hint: SYNC_HINT,
  });

  results.push({
    check: "launcher background #EEF3F2",
    ok: iconGate.bgOk,
    detail: iconGate.bgPath,
    hint: SYNC_HINT,
  });

  results.push({
    check: "launcher mipmaps (mdpi + xxxhdpi foreground)",
    ok: iconGate.mipmapsOk,
    detail: `${iconGate.mdpiFg}, ${iconGate.xxxhdpiFg}`,
    hint: "Run `npm run export:icon` then re-run pre-upload.",
  });

  console.log("\nPlay pre-upload checks\n");
  let fail = 0;
  for (const row of results) {
    const mark = row.ok ? "PASS" : "FAIL";
    if (!row.ok) fail += 1;
    console.log(`${mark}  ${row.check}: ${row.detail}`);
    if (!row.ok && row.hint) {
      console.log(`      → ${row.hint}`);
    }
  }

  if (glanceGate.hasGlanceReceiver && !glanceGate.glanceFilesOk) {
    console.log(
      `WARN  Glance widget receiver in manifest but Kotlin sources missing: ${glanceGate.glanceWidgetPath}`
    );
  }

  console.log("");

  if (fail > 0) {
    console.log(`${fail} check(s) failed — fix before uploading AAB.\n`);
    process.exit(1);
  }

  console.log("All checks passed. Build signed AAB in Android Studio (release).\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
