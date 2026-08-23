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
  return "Turn on Location in your phone settings, then try Near me again — or choose a station below.";
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
export async function ensureLocationPermission() {
  let status;
  try {
    status = await Geolocation.checkPermissions();
  } catch {
    status = null;
  }

  if (permissionGranted(status)) {
    return { granted: true, status };
  }

  if (permissionDenied(status)) {
    const error = new Error(locationPermissionHelpMessage());
    error.code = 1;
    throw error;
  }

  try {
    status = await Geolocation.requestPermissions();
  } catch (error) {
    const denied = new Error(locationPermissionHelpMessage());
    denied.code = 1;
    denied.cause = error;
    throw denied;
  }

  if (!permissionGranted(status)) {
    // iOS can report prompt briefly after Allow — re-check once.
    try {
      status = await Geolocation.checkPermissions();
    } catch {
      status = null;
    }
  }

  if (!permissionGranted(status)) {
    const error = new Error(locationPermissionHelpMessage());
    error.code = 1;
    throw error;
  }

  return { granted: true, status };
}

function mapGeolocationError(error) {
  const message = String(error?.message || error || "");
  const lower = message.toLowerCase();

  if (
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
        : "Couldn’t get your location. On an emulator, set a mock GPS (Extended controls → Location). On a phone, turn on Location — or choose a station below."
    );
    timeout.code = 3;
    timeout.cause = error;
    throw timeout;
  }

  throw error;
}

export async function getCurrentPosition(options = {}) {
  await ensureLocationPermission();

  const timeout = options.timeout ?? (isIos() ? 20000 : 15000);
  const maximumAge = options.maximumAge ?? 60000;
  const preferHighAccuracy = Boolean(options.enableHighAccuracy);
  const attempts = preferHighAccuracy
    ? [{ enableHighAccuracy: true }, { enableHighAccuracy: false }]
    : [{ enableHighAccuracy: false }, { enableHighAccuracy: true }];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: attempt.enableHighAccuracy,
        timeout,
        maximumAge,
      });

      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed ?? null,
        },
      };
    } catch (error) {
      lastError = error;
    }
  }

  mapGeolocationError(lastError);
}
