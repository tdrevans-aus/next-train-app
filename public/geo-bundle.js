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

  // node_modules/@capacitor/geolocation/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    Geolocation: () => Geolocation,
    GeolocationWeb: () => GeolocationWeb
  });
  var import_core, GeolocationWeb, Geolocation;
  var init_web = __esm({
    "node_modules/@capacitor/geolocation/dist/esm/web.js"() {
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

  // public/geo-native.mjs
  var geo_native_exports = {};
  __export(geo_native_exports, {
    getCurrentPosition: () => getCurrentPosition
  });

  // node_modules/@capacitor/geolocation/dist/esm/index.js
  var import_core2 = __require("@capacitor/core");

  // node_modules/@capacitor/synapse/dist/synapse.mjs
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

  // node_modules/@capacitor/geolocation/dist/esm/index.js
  var Geolocation2 = (0, import_core2.registerPlugin)("Geolocation", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.GeolocationWeb())
  });
  f();

  // public/geo-native.mjs
  async function getCurrentPosition(options = {}) {
    const position = await Geolocation2.getCurrentPosition({
      enableHighAccuracy: Boolean(options.enableHighAccuracy),
      timeout: options.timeout ?? 1e4,
      maximumAge: options.maximumAge ?? 6e4
    });
    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed ?? null
      }
    };
  }
  return __toCommonJS(geo_native_exports);
})();
