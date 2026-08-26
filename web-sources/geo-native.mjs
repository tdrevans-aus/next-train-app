import { Geolocation } from "@capacitor/geolocation";

function isIos() {
  return globalThis.Capacitor?.getPlatform?.() === "ios";
}

function locationPermissionHelpMessage() {
  if (isIos()) {
    return "Location is off for this visit. Tap Near me and choose While Using the App, or open Settings → Next Train → Location. You can also pick a station below.";
  }
  return "Location permission is needed for Near me. Open Settings → Apps → Next Train → Location → Allow, or choose a station below.";
}

function locationServicesOffMessage() {
  if (isIos()) {
    return "Turn on Location Services in Settings → Privacy & Security → Location Services, then try Near me again — or choose a station below.";
  }
  return "Location services are off. Turn on Location in your phone settings, then try Near me again — or choose a station below.";
}

function permissionGranted(status) {
  const location = status?.location ?? status?.coarseLocation;
  return location === "granted" || location === "limited";
}

function permissionDenied(status) {
  const location = status?.location ?? status?.coarseLocation;
  return location === "denied";
}

/**
 * Ensure Android/iOS shows the system location prompt before the first fix.
 * getCurrentPosition alone does not reliably prompt on first Near me open.
 */
let permissionPromise = null;

export function resetLocationPermissionCache() {
  permissionPromise = null;
}

export async function ensureLocationPermission() {
  if (permissionPromise) {
    return permissionPromise;
  }

  permissionPromise = (async () => {
    let status;
    try {
      status = await Geolocation.checkPermissions();
      console.log("[Geo] checkPermissions status:", JSON.stringify(status));
    } catch (e) {
      console.warn("[Geo] checkPermissions failed:", e);
      status = null;
    }

    if (permissionGranted(status)) {
      return { granted: true, status };
    }

    if (permissionDenied(status)) {
      console.log("[Geo] Permission denied by check");
      const error = new Error(locationPermissionHelpMessage());
      error.code = 1;
      throw error;
    }

    try {
      console.log("[Geo] Requesting permissions...");
      const requestPromise = Geolocation.requestPermissions({
        permissions: ["location", "coarseLocation"],
      });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Permission request timeout")), 15000);
      });
      status = await Promise.race([requestPromise, timeoutPromise]);
      console.log("[Geo] requestPermissions result:", JSON.stringify(status));
    } catch (error) {
      console.warn("[Geo] requestPermissions failed:", error);
      status = await Geolocation.checkPermissions();
    }

    if (!permissionGranted(status)) {
      await new Promise((r) => setTimeout(r, 1000));
      status = await Geolocation.checkPermissions();
      console.log("[Geo] Final check after delay:", JSON.stringify(status));
    }

    if (!permissionGranted(status)) {
      if (status?.location === "prompt" || status?.coarseLocation === "prompt") {
        console.log("[Geo] Status is still prompt, proceeding to getCurrentPosition anyway");
        return { granted: false, status };
      }

      console.log("[Geo] Final permission check failed:", JSON.stringify(status));
      const error = new Error(locationPermissionHelpMessage());
      error.code = 1;
      throw error;
    }

    return { granted: true, status };
  })();

  try {
    return await permissionPromise;
  } finally {
    permissionPromise = null;
  }
}

function mapGeolocationError(error) {
  if (!error) return;
  console.log("[Geo] mapGeolocationError raw:", JSON.stringify(error));

  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  const lower = message.toLowerCase();

  if (
    lower.includes("disabled") ||
    (lower.includes("location services") && lower.includes("off")) ||
    lower.includes("not enabled")
  ) {
    const disabled = new Error(locationServicesOffMessage());
    disabled.code = 2;
    disabled.cause = error;
    throw disabled;
  }

  if (
    Number(error?.code) === 1 ||
    lower.includes("denied") ||
    lower.includes("permission")
  ) {
    const denied = new Error(locationPermissionHelpMessage());
    denied.code = 1;
    denied.cause = error;
    throw denied;
  }

  if (
    code === "OS-PLUG-GLOC-0010" ||
    Number(error?.code) === 3 ||
    lower.includes("timeout") ||
    lower.includes("could not obtain location in time") ||
    lower.includes("location unavailable") ||
    lower.includes("timed out")
  ) {
    const timeout = new Error(
      isIos()
        ? "Couldn't get your location in time. On iPad, try Wi‑Fi, move near a window, or choose a station below."
        : "Couldn’t get your location in time. Turn on Location — or choose a station below."
    );
    timeout.code = 3;
    timeout.cause = error;
    throw timeout;
  }

  throw error;
}

function isEmulator() {
  const ua = String(navigator?.userAgent || "");
  return /sdk_gphone|emulator|Android SDK built for/i.test(ua);
}

function readPositionCoords(position) {
  if (!position) {
    return null;
  }

  const coords = position.coords ?? position;
  const latitude = coords?.latitude ?? position.latitude;
  const longitude = coords?.longitude ?? position.longitude;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    console.warn("[Geo] Invalid position shape:", JSON.stringify(position));
    return null;
  }

  return {
    latitude,
    longitude,
    speed: coords?.speed ?? position.speed ?? null,
  };
}

function withDeadline(promise, ms) {
  const budgetMs = Math.max(Number(ms) || 0, 1000);
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error("Could not obtain location in time");
        error.code = 3;
        reject(error);
      }, budgetMs);
    }),
  ]);
}

async function readNavigatorPosition(options = {}) {
  if (!navigator.geolocation) {
    return null;
  }

  const timeout = options.timeout ?? 5000;
  const maximumAge = options.maximumAge ?? 60000;
  const enableHighAccuracy = Boolean(options.enableHighAccuracy);

  console.log("[Geo] navigator.geolocation attempt...");
  const position = await withDeadline(
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy,
        timeout,
        maximumAge: isEmulator() ? 0 : maximumAge,
      });
    }),
    timeout + 1000
  );

  const coords = readPositionCoords(position);
  if (!coords) {
    throw new Error("Geolocation returned an invalid position");
  }

  console.log("[Geo] navigator.geolocation success");
  return { coords };
}

export async function getCurrentPosition(options = {}) {
  await ensureLocationPermission();

  const timeout = options.timeout ?? (isIos() ? 8000 : 5000);
  const maximumAge = options.maximumAge ?? 60000;
  const preferHighAccuracy = Boolean(options.enableHighAccuracy);

  // A cached fused fix returns in well under a second, so the first attempt stays
  // short. The GPS retry is what rescues a cold start where the network provider
  // has nothing, so it gets the longer budget.
  const nativeAttempts = preferHighAccuracy
    ? [
        { enableHighAccuracy: true, maximumAge, timeout },
        { enableHighAccuracy: false, maximumAge, timeout },
      ]
    : isEmulator()
      ? [
          { enableHighAccuracy: false, maximumAge: 0, timeout },
          {
            enableHighAccuracy: false,
            maximumAge: Math.max(maximumAge, 24 * 60 * 60 * 1000),
            timeout,
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout },
        ]
      : [
          { enableHighAccuracy: false, maximumAge, timeout },
          { enableHighAccuracy: true, maximumAge, timeout: Math.max(timeout, 6000) },
        ];

  let lastError = null;
  for (const attempt of nativeAttempts) {
    try {
      console.log(
        `[Geo] getCurrentPosition attempt: accuracy=${attempt.enableHighAccuracy}, timeout=${attempt.timeout}, maximumAge=${attempt.maximumAge}`
      );
      const position = await withDeadline(
        Geolocation.getCurrentPosition({
          enableHighAccuracy: attempt.enableHighAccuracy,
          timeout: attempt.timeout,
          maximumAge: attempt.maximumAge,
        }),
        attempt.timeout + 1000
      );

      const coords = readPositionCoords(position);
      if (!coords) {
        throw new Error("Geolocation returned an invalid position");
      }

      console.log("[Geo] getCurrentPosition success");
      return { coords };
    } catch (error) {
      console.warn(`[Geo] getCurrentPosition attempt failed:`, error.message || error);
      lastError = error;
    }
  }

  if (navigator.geolocation) {
    try {
      return await readNavigatorPosition({
        enableHighAccuracy: preferHighAccuracy,
        timeout,
        maximumAge,
      });
    } catch (error) {
      console.warn("[Geo] navigator.geolocation failed:", error.message || error);
      lastError = error;
    }
  }

  mapGeolocationError(lastError);
}
