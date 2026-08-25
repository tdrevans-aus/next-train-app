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
      // Explicitly request both for Android 12+ robustness
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
      // Fallback: try one more check in case it's a transient failure
      status = await Geolocation.checkPermissions();
    }

    if (!permissionGranted(status)) {
      // If still prompt, it might mean the dialog is open or rejected immediately.
      // We'll give it one more chance with a short delay.
      await new Promise((r) => setTimeout(r, 1000));
      status = await Geolocation.checkPermissions();
      console.log("[Geo] Final check after delay:", JSON.stringify(status));
    }

    if (!permissionGranted(status)) {
      // On some emulators/versions, requestPermissions returns prompt even if it worked.
      // We'll proceed if it's prompt and let getCurrentPosition handle the final failure.
      if (status?.location === "prompt" || status?.coarseLocation === "prompt") {
        console.log("[Geo] Status is still prompt, proceeding to getCurrentPosition anyway");
        return { granted: false, status }; // Not granted yet, but not denied
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
    code === "OS-PLUG-GLOC-0010" ||
    lower.includes("disabled") ||
    lower.includes("location services") ||
    lower.includes("not enabled") ||
    lower.includes("location unavailable")
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
    Number(error?.code) === 3 ||
    lower.includes("timeout") ||
    lower.includes("could not obtain location in time") ||
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

export async function getCurrentPosition(options = {}) {
  await ensureLocationPermission();

  const timeout = options.timeout ?? (isIos() ? 20000 : 15000);
  const maximumAge = options.maximumAge ?? 60000;
  const preferHighAccuracy = Boolean(options.enableHighAccuracy);

  const nativeAttempts = preferHighAccuracy
    ? [
        { enableHighAccuracy: true, maximumAge },
        { enableHighAccuracy: false, maximumAge },
      ]
    : isEmulator()
      ? [
          // Emulator: prefer a fresh mock fix (Extended controls → SET LOCATION).
          { enableHighAccuracy: false, maximumAge: 0 },
          { enableHighAccuracy: false, maximumAge: Math.max(maximumAge, 24 * 60 * 60 * 1000) },
          { enableHighAccuracy: true, maximumAge: 0 },
        ]
      : [
          { enableHighAccuracy: false, maximumAge },
          { enableHighAccuracy: true, maximumAge },
        ];

  let lastError = null;
  for (const attempt of nativeAttempts) {
    try {
      console.log(
        `[Geo] getCurrentPosition attempt: accuracy=${attempt.enableHighAccuracy}, timeout=${timeout}, maximumAge=${attempt.maximumAge}`
      );
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: attempt.enableHighAccuracy,
        timeout,
        maximumAge: attempt.maximumAge,
      });

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

  // Fallback to browser geolocation if native fails
  if (navigator.geolocation) {
    try {
      console.log("[Geo] Falling back to navigator.geolocation...");
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: preferHighAccuracy,
          timeout: timeout + 5000,
          maximumAge: isEmulator() ? 0 : maximumAge,
        });
      });
      console.log("[Geo] navigator.geolocation success");
      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed ?? null,
        },
      };
    } catch (error) {
      console.warn("[Geo] navigator.geolocation failed:", error.message || error);
    }
  }

  mapGeolocationError(lastError);
}
