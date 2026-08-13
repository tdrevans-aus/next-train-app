/**
 * Shared adb helpers — pick one device when phone + emulator are both attached.
 *
 * Resolution order:
 * 1. ANDROID_SERIAL env
 * 2. Prefer emulator-* (or emulator:true option)
 * 3. Prefer USB device (preferEmulator:false)
 * 4. First `device` in `adb devices`
 */
import { spawnSync } from "child_process";

export function listAdbDevices() {
  const result = spawnSync("adb", ["devices"], {
    encoding: "utf8",
    shell: false,
  });
  if (result.error || result.status !== 0) {
    return [];
  }

  return result.stdout
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith("device"))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
}

export function resolveAdbSerial({ preferEmulator = true } = {}) {
  const fromEnv = String(process.env.ANDROID_SERIAL || "").trim();
  const devices = listAdbDevices();

  if (fromEnv) {
    if (devices.includes(fromEnv)) {
      return fromEnv;
    }
    throw new Error(
      `ANDROID_SERIAL=${fromEnv} not in adb devices (${devices.join(", ") || "none"})`
    );
  }

  if (devices.length === 0) {
    return null;
  }

  if (devices.length === 1) {
    return devices[0];
  }

  const emulators = devices.filter((id) => id.startsWith("emulator-"));
  const hardware = devices.filter((id) => !id.startsWith("emulator-"));

  if (preferEmulator && emulators.length) {
    return emulators[0];
  }
  if (!preferEmulator && hardware.length) {
    return hardware[0];
  }

  return devices[0];
}

/**
 * Run adb with an optional -s serial. Pass serial:null to omit -s.
 */
export function adb(args, { serial, preferEmulator = true } = {}) {
  const resolved =
    serial === null
      ? null
      : serial !== undefined
        ? serial
        : resolveAdbSerial({ preferEmulator });

  const fullArgs = resolved ? ["-s", resolved, ...args] : [...args];
  const result = spawnSync("adb", fullArgs, { encoding: "utf8", shell: false });
  return {
    status: result.status ?? 1,
    out: (result.stdout || "").trim(),
    err: (result.stderr || "").trim(),
    serial: resolved,
  };
}

export function adbOk(args, options = {}) {
  const result = adb(args, options);
  if (result.status !== 0) {
    throw new Error(
      `adb ${result.serial ? `-s ${result.serial} ` : ""}${args.join(" ")} failed: ${
        result.err || result.out
      }`
    );
  }
  return result.out;
}
