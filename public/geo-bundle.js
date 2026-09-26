var NextTrainGeo = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../../../node_modules/@capacitor/geolocation/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    Geolocation: () => Geolocation,
    GeolocationWeb: () => GeolocationWeb
  });
  var import_core, GeolocationWeb, Geolocation;
  var init_web = __esm({
    "../../../node_modules/@capacitor/geolocation/dist/esm/web.js"() {
      import_core = __require("@capacitor/core");
      GeolocationWeb = class extends import_core.WebPlugin {
        constructor() {
          super();
          this.latestOrientation = null;
          if (typeof window !== "undefined") {
            const win = window;
            if ("ondeviceorientationabsolute" in win) {
              win.addEventListener("deviceorientationabsolute", (event) => this.updateOrientation(event, true), true);
            } else if ("ondeviceorientation" in win) {
              win.addEventListener("deviceorientation", (event) => this.updateOrientation(event, false), true);
            }
          }
        }
        updateOrientation(event, isAbsolute) {
          let trueHeading = null;
          let magneticHeading = null;
          let headingAccuracy = null;
          if (isAbsolute && event.alpha !== null) {
            trueHeading = (360 - event.alpha) % 360;
          } else if (event.webkitCompassHeading !== void 0 && event.webkitCompassHeading !== null) {
            magneticHeading = event.webkitCompassHeading;
            headingAccuracy = event.webkitCompassAccuracy;
          } else if (event.alpha !== null && event.absolute === true) {
            trueHeading = (360 - event.alpha) % 360;
          } else if (event.alpha !== null) {
            magneticHeading = (360 - event.alpha) % 360;
          }
          if (trueHeading !== null || magneticHeading !== null) {
            this.latestOrientation = {
              trueHeading,
              magneticHeading,
              headingAccuracy
            };
          }
        }
        augmentPosition(pos, isWatch = false) {
          var _a, _b, _c, _d, _e, _f, _g;
          const coords = pos.coords;
          const orientation = isWatch ? this.latestOrientation : null;
          const heading = (_c = (_b = (_a = orientation === null || orientation === void 0 ? void 0 : orientation.trueHeading) !== null && _a !== void 0 ? _a : orientation === null || orientation === void 0 ? void 0 : orientation.magneticHeading) !== null && _b !== void 0 ? _b : isWatch ? coords.heading : null) !== null && _c !== void 0 ? _c : null;
          return {
            timestamp: pos.timestamp,
            coords: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              altitude: coords.altitude,
              altitudeAccuracy: coords.altitudeAccuracy,
              speed: coords.speed,
              heading,
              magneticHeading: (_d = orientation === null || orientation === void 0 ? void 0 : orientation.magneticHeading) !== null && _d !== void 0 ? _d : null,
              trueHeading: (_e = orientation === null || orientation === void 0 ? void 0 : orientation.trueHeading) !== null && _e !== void 0 ? _e : null,
              headingAccuracy: (_f = orientation === null || orientation === void 0 ? void 0 : orientation.headingAccuracy) !== null && _f !== void 0 ? _f : null,
              course: (_g = isWatch ? coords.heading : null) !== null && _g !== void 0 ? _g : null
            }
          };
        }
        async getCurrentPosition(options) {
          return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition((pos) => {
              resolve(this.augmentPosition(pos, false));
            }, (err) => {
              reject(err);
            }, Object.assign({ enableHighAccuracy: false, timeout: 1e4, maximumAge: 0 }, options));
          });
        }
        async watchPosition(options, callback) {
          const id = navigator.geolocation.watchPosition((pos) => {
            callback(this.augmentPosition(pos, true));
          }, (err) => {
            callback(null, err);
          }, Object.assign({ enableHighAccuracy: false, timeout: 1e4, maximumAge: 0, minimumUpdateInterval: 5e3 }, options));
          return `${id}`;
        }
        async clearWatch(options) {
          navigator.geolocation.clearWatch(parseInt(options.id, 10));
        }
        async checkPermissions() {
          if (typeof navigator === "undefined" || !navigator.permissions) {
            throw this.unavailable("Permissions API not available in this browser");
          }
          const permission = await navigator.permissions.query({
            name: "geolocation"
          });
          return { location: permission.state, coarseLocation: permission.state };
        }
        async requestPermissions() {
          throw this.unimplemented("Not implemented on web.");
        }
      };
      Geolocation = new GeolocationWeb();
    }
  });

  // web-sources/geo-native.mjs
  var geo_native_exports = {};
  __export(geo_native_exports, {
    ensureLocationPermission: () => ensureLocationPermission,
    getCurrentPosition: () => getCurrentPosition,
    resetLocationPermissionCache: () => resetLocationPermissionCache
  });

  // ../../../node_modules/@capacitor/geolocation/dist/esm/index.js
  var import_core2 = __require("@capacitor/core");

  // ../../../node_modules/@capacitor/synapse/dist/synapse.mjs
  function s(t) {
    t.CapacitorUtils.Synapse = new Proxy(
      {},
      {
        get(e, n) {
          return new Proxy({}, {
            get(w, o) {
              return (c, p, r) => {
                const i = t.Capacitor.Plugins[n];
                if (i === void 0) {
                  r(new Error(`Capacitor plugin ${n} not found`));
                  return;
                }
                if (typeof i[o] != "function") {
                  r(new Error(`Method ${o} not found in Capacitor plugin ${n}`));
                  return;
                }
                (async () => {
                  try {
                    const a = await i[o](c);
                    p(a);
                  } catch (a) {
                    r(a);
                  }
                })();
              };
            }
          });
        }
      }
    );
  }
  function u(t) {
    t.CapacitorUtils.Synapse = new Proxy(
      {},
      {
        get(e, n) {
          return t.cordova.plugins[n];
        }
      }
    );
  }
  function f(t = false) {
    typeof window > "u" || (window.CapacitorUtils = window.CapacitorUtils || {}, window.Capacitor !== void 0 && !t ? s(window) : window.cordova !== void 0 && u(window));
  }

  // ../../../node_modules/@capacitor/geolocation/dist/esm/index.js
  var Geolocation2 = (0, import_core2.registerPlugin)("Geolocation", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.GeolocationWeb())
  });
  f();

  // web-sources/geo-native.mjs
  function isIos() {
    return globalThis.Capacitor?.getPlatform?.() === "ios";
  }
  function isNativePlatform() {
    return Boolean(globalThis.Capacitor?.isNativePlatform?.());
  }
  function locationPermissionHelpMessage() {
    if (isIos()) {
      return "Location is off for this visit. Tap Near me and choose While Using the App, or open Settings \u2192 Next Train \u2192 Location. You can also pick a station below.";
    }
    return "Location permission is needed for Near me. Open Settings \u2192 Apps \u2192 Next Train \u2192 Location \u2192 Allow, or choose a station below.";
  }
  function locationServicesOffMessage() {
    if (isIos()) {
      return "Turn on Location Services in Settings \u2192 Privacy & Security \u2192 Location Services, then try Near me again \u2014 or choose a station below.";
    }
    return "Location services are off. Turn on Location in your phone settings, then try Near me again \u2014 or choose a station below.";
  }
  function permissionGranted(status) {
    const location = status?.location ?? status?.coarseLocation;
    return location === "granted" || location === "limited";
  }
  function permissionDenied(status) {
    const location = status?.location ?? status?.coarseLocation;
    return location === "denied";
  }
  var permissionPromise = null;
  function resetLocationPermissionCache() {
    permissionPromise = null;
  }
  async function ensureLocationPermission() {
    if (permissionPromise) {
      return permissionPromise;
    }
    permissionPromise = (async () => {
      let status;
      try {
        status = await Geolocation2.checkPermissions();
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
        const requestPromise = Geolocation2.requestPermissions({
          permissions: ["location", "coarseLocation"]
        });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Permission request timeout")), 15e3);
        });
        status = await Promise.race([requestPromise, timeoutPromise]);
        console.log("[Geo] requestPermissions result:", JSON.stringify(status));
      } catch (error) {
        console.warn("[Geo] requestPermissions failed:", error);
        status = await Geolocation2.checkPermissions();
      }
      if (!permissionGranted(status)) {
        await new Promise((r) => setTimeout(r, 1e3));
        status = await Geolocation2.checkPermissions();
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
    if (lower.includes("disabled") || lower.includes("location services") && lower.includes("off") || lower.includes("not enabled")) {
      const disabled = new Error(locationServicesOffMessage());
      disabled.code = 2;
      disabled.cause = error;
      throw disabled;
    }
    if (Number(error?.code) === 1 || lower.includes("denied") || lower.includes("permission")) {
      const denied = new Error(locationPermissionHelpMessage());
      denied.code = 1;
      denied.cause = error;
      throw denied;
    }
    if (code === "OS-PLUG-GLOC-0010" || Number(error?.code) === 3 || lower.includes("timeout") || lower.includes("could not obtain location in time") || lower.includes("location unavailable") || lower.includes("timed out")) {
      const timeout = new Error(
        isIos() ? "Couldn't get your location in time. On iPad, try Wi\u2011Fi, move near a window, or choose a station below." : "Couldn\u2019t get your location in time. Turn on Location \u2014 or choose a station below."
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
      speed: coords?.speed ?? position.speed ?? null
    };
  }
  function withDeadline(promise, ms) {
    const budgetMs = Math.max(Number(ms) || 0, 1e3);
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error("Could not obtain location in time");
          error.code = 3;
          reject(error);
        }, budgetMs);
      })
    ]);
  }
  async function readNavigatorPosition(options = {}) {
    if (!navigator.geolocation) {
      return null;
    }
    const timeout = options.timeout ?? 5e3;
    const maximumAge = options.maximumAge ?? 6e4;
    const enableHighAccuracy = Boolean(options.enableHighAccuracy);
    console.log("[Geo] navigator.geolocation attempt...");
    const position = await withDeadline(
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy,
          timeout,
          maximumAge: isEmulator() ? 0 : maximumAge
        });
      }),
      timeout + 1e3
    );
    const coords = readPositionCoords(position);
    if (!coords) {
      throw new Error("Geolocation returned an invalid position");
    }
    console.log("[Geo] navigator.geolocation success");
    return { coords };
  }
  async function getCurrentPosition(options = {}) {
    await ensureLocationPermission();
    const timeout = options.timeout ?? (isIos() ? 8e3 : 5e3);
    const maximumAge = options.maximumAge ?? 6e4;
    const preferHighAccuracy = Boolean(options.enableHighAccuracy);
    const nativeAttempts = preferHighAccuracy ? [
      { enableHighAccuracy: true, maximumAge, timeout },
      { enableHighAccuracy: false, maximumAge, timeout }
    ] : isEmulator() ? [
      { enableHighAccuracy: false, maximumAge: 0, timeout },
      {
        enableHighAccuracy: false,
        maximumAge: Math.max(maximumAge, 24 * 60 * 60 * 1e3),
        timeout
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout }
    ] : [
      { enableHighAccuracy: false, maximumAge, timeout },
      { enableHighAccuracy: true, maximumAge, timeout: Math.max(timeout, 6e3) }
    ];
    let lastError = null;
    for (const attempt of nativeAttempts) {
      try {
        console.log(
          `[Geo] getCurrentPosition attempt: accuracy=${attempt.enableHighAccuracy}, timeout=${attempt.timeout}, maximumAge=${attempt.maximumAge}`
        );
        const position = await withDeadline(
          Geolocation2.getCurrentPosition({
            enableHighAccuracy: attempt.enableHighAccuracy,
            timeout: attempt.timeout,
            maximumAge: attempt.maximumAge
          }),
          attempt.timeout + 1e3
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
    if (!isNativePlatform() && navigator.geolocation) {
      try {
        return await readNavigatorPosition({
          enableHighAccuracy: preferHighAccuracy,
          timeout,
          maximumAge
        });
      } catch (error) {
        console.warn("[Geo] navigator.geolocation failed:", error.message || error);
        lastError = error;
      }
    }
    mapGeolocationError(lastError);
  }
  return __toCommonJS(geo_native_exports);
})();
