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
  const sentryPrefabOverlay =
    /apply from:\s*'native-debug-symbols\.gradle'/.test(text);
  const ndkVersionPinned = /ndkVersion\s+"[\d.]+"/.test(text);
  return {
    applicationId,
    versionCode,
    versionName,
    gradlePath,
    text,
    minifyEnabled,
    nativeSymbolsConfigured,
    sentryPrefabOverlay,
    ndkVersionPinned,
  };
}

function readAndroidManifest() {
  const manifestPath = path.join(ROOT, "android/app/src/main/AndroidManifest.xml");
  return {
    manifestPath,
    text: fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, "utf8") : "",
  };
}

function checkExactAlarmPermissions(manifestText) {
  const hasUseExactAlarm = manifestText.includes("USE_EXACT_ALARM");
  const hasScheduleExactAlarm = manifestText.includes("SCHEDULE_EXACT_ALARM");
  const scheduleCappedToApi32 =
    /SCHEDULE_EXACT_ALARM[\s\S]*maxSdkVersion\s*=\s*"32"/.test(manifestText);
  return { hasUseExactAlarm, hasScheduleExactAlarm, scheduleCappedToApi32 };
}

function checkGlanceWidget(manifest) {
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
  const nearby = readSyncedAsset("nearby-mode.js");
  const geoOk =
    geo.text != null && geo.text.includes("ensureLocationPermission");
  const appOk =
    app.text != null &&
    app.text.includes("enterNearbyMode") &&
    nearby.text != null &&
    nearby.text.includes("ensureLocationPermission");
  return {
    geoOk,
    appOk,
    geoPath: geo.assetPath,
    appPath: nearby.assetPath || app.assetPath,
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

function readLocalSdkDir() {
  const localPropsPath = path.join(ROOT, "android/local.properties");
  if (!fs.existsSync(localPropsPath)) {
    return null;
  }
  const text = fs.readFileSync(localPropsPath, "utf8");
  const match = text.match(/^sdk\.dir=(.+)$/m);
  if (!match) {
    return null;
  }
  return match[1].trim().replace(/\\:/g, ":").replace(/\\\\/g, "\\");
}

function checkNdkInstalled(gradleText) {
  const versionMatch = gradleText.match(/ndkVersion\s+"([^"]+)"/);
  const ndkVersion = versionMatch?.[1];
  const sdkDir = readLocalSdkDir();
  if (!ndkVersion || !sdkDir) {
    return { ok: false, detail: "ndkVersion or sdk.dir missing" };
  }
  const windowsSdkDir = sdkDir;
  const ndkPath = path.join(windowsSdkDir, "ndk", ndkVersion);
  return {
    ok: fs.existsSync(ndkPath),
    detail: fs.existsSync(ndkPath) ? ndkPath : `missing ${ndkPath}`,
    ndkVersion,
  };
}
function checkScratchAssets() {
  const scratch = path.join(ROOT, "public");
  const scratchFiles = fs
    .readdirSync(scratch)
    .filter((name) => name.startsWith("_") && name.endsWith(".txt"));
  const syncedScratch = path.join(
    ROOT,
    "android/app/src/main/assets/public"
  );
  const syncedScratchFiles = fs.existsSync(syncedScratch)
    ? fs.readdirSync(syncedScratch).filter((name) => name.startsWith("_"))
    : [];
  return { scratchFiles, syncedScratchFiles };
}

async function main() {
  const results = [];
  const gradle = readBuildGradle();
  const site = readSiteConfig();
  const privacy = await checkPrivacyUrl();
  const locationGate = checkSyncedLocationGate();
  const iconGate = checkLauncherIconGate();
  const manifest = readAndroidManifest();
  const exactAlarmGate = checkExactAlarmPermissions(manifest.text);
  const glanceGate = checkGlanceWidget(manifest.text);
  const scratchGate = checkScratchAssets();
  const ndkGate = checkNdkInstalled(gradle.text);

  results.push({
    check: "native debug symbols (debugSymbolLevel SYMBOL_TABLE)",
    ok: gradle.nativeSymbolsConfigured,
    detail: gradle.gradlePath,
    hint: "Add ndk { debugSymbolLevel 'SYMBOL_TABLE' } to release buildType — see docs/jim-brief-play-hygiene.md §3",
  });

  results.push({
    check: "Sentry unstripped prefab overlay (Play native symbols)",
    ok: gradle.sentryPrefabOverlay,
    detail: gradle.sentryPrefabOverlay
      ? "native-debug-symbols.gradle applied"
      : "missing apply from: native-debug-symbols.gradle",
    hint: "Sentry jni .so files are stripped; overlay prefab libs before extractReleaseNativeSymbolTables",
  });

  results.push({
    check: "NDK version pinned (Play native symbols)",
    ok: gradle.ndkVersionPinned,
    detail: gradle.ndkVersionPinned ? "ndkVersion set" : "missing ndkVersion",
    hint: "Pin ndkVersion in app/build.gradle; install NDK via Android Studio SDK Manager before bundleRelease",
  });

  results.push({
    check: "NDK installed locally (native symbols extract)",
    ok: ndkGate.ok,
    detail: ndkGate.detail,
    hint: `Android Studio → SDK Manager → SDK Tools → NDK (Side by side) ${ndkGate.ndkVersion ?? ""}`.trim(),
  });

  results.push({
    check: "no scratch _*.txt in public/ or synced assets",
    ok: scratchGate.scratchFiles.length === 0 && scratchGate.syncedScratchFiles.length === 0,
    detail:
      scratchGate.scratchFiles.length || scratchGate.syncedScratchFiles.length
        ? [...scratchGate.scratchFiles, ...scratchGate.syncedScratchFiles].join(", ")
        : "clean",
    hint: "Delete scratch files and run `npm run cap:sync`",
  });

  results.push({
    check: "minify / R8 off for v3 public",
    ok: !gradle.minifyEnabled,
    detail: gradle.minifyEnabled ? "minifyEnabled true" : "minifyEnabled false",
    hint: "mapping.txt required — see docs/jim-brief-play-hygiene.md §4",
  });

  results.push({
    check: "exact alarm permissions (SCHEDULE_EXACT_ALARM only)",
    ok:
      exactAlarmGate.hasScheduleExactAlarm &&
      !exactAlarmGate.hasUseExactAlarm &&
      !exactAlarmGate.scheduleCappedToApi32,
    detail: exactAlarmGate.hasUseExactAlarm
      ? "USE_EXACT_ALARM present — remove per Play policy"
      : exactAlarmGate.scheduleCappedToApi32
        ? "SCHEDULE_EXACT_ALARM capped to API 32"
        : exactAlarmGate.hasScheduleExactAlarm
          ? "SCHEDULE_EXACT_ALARM"
          : "missing SCHEDULE_EXACT_ALARM",
    hint: "Complete Play Console → App content → Exact alarms before upload — docs/aab-signing-closed-testing.md",
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
