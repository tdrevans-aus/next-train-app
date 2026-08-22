import { Geolocation } from "@capacitor/geolocation";

function locationPermissionHelpMessage() {
  if (globalThis.Capacitor?.getPlatform?.() === "ios") {
    return "Location is off for this visit. Tap Near me and choose While Using the App, or open Settings → Next Train → Location. You can also pick a station below.";
  }
  return "Location permission is needed for Near me. Open Settings → Apps → Next Train → Location → Allow, or choose a station below.";
}

function permissionGranted(status) {
  const location = status?.location ?? status?.coarseLocation;
  return location === "granted";
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
    const error = new Error(locationPermissionHelpMessage());
    error.code = 1;
    throw error;
  }

  return { granted: true, status };
}

export async function getCurrentPosition(options = {}) {
  await ensureLocationPermission();

  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: Boolean(options.enableHighAccuracy),
      timeout: options.timeout ?? 10000,
      maximumAge: options.maximumAge ?? 60000,
    });

    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed ?? null,
      },
    };
  } catch (error) {
    const message = String(error?.message || error || "");
    const lower = message.toLowerCase();
    if (
      lower.includes("disabled") ||
      lower.includes("location services") ||
      lower.includes("not enabled") ||
      lower.includes("location unavailable")
    ) {
      const disabled = new Error(
        "Turn on Location in your phone settings, then try Near me again — or choose a station below."
      );
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

    throw error;
  }
}
