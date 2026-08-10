import { Geolocation } from "@capacitor/geolocation";

export async function getCurrentPosition(options = {}) {
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
}
