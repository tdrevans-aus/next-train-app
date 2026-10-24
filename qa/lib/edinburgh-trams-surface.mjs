/**
 * Captures every rider-reachable Edinburgh surface that the tram wiring must
 * leave untouched while the tram switch is off (registry `tramsLive: false`),
 * and reduces each to a sha256. The golden file next to it
 * (qa/fixtures/edinburgh-trams-switch-off.golden.json) was captured from
 * unmodified master BEFORE any tram-wiring edit, so equality proves the
 * switch-off state is byte-identical to master for:
 *   - /api/city-stations and /api/country-stations (picker + catalog output),
 *   - /api/board and /api/directions for every tram stop (503 / error shape),
 *   - Near me nearest-station results around every tram stop,
 *   - the UK region catalog and the dogfood station list.
 * National Rail boards are not captured: they need a Darwin token and the tram
 * wiring never touches that path (asserted separately by the gate).
 *
 * Only pre-existing exports are used, so this file runs unchanged on master.
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import cityStations from "../../api/city-stations.js";
import countryStations from "../../api/country-stations.js";
import cities from "../../api/cities.js";
import board from "../../api/board.js";
import directions from "../../api/directions.js";
import { findNearestStation, listMultiCityStations } from "../../lib/cities/live-city-api.js";
import { listCatalogStations, getRegion } from "../../lib/providers/uk/catalog.js";
import { listEdinburghDogfoodStations } from "../../lib/cities/edinburgh/dogfood-next-train.js";
import { getMultiCityDirections } from "../../lib/cities/live-city-api.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function sha(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {},
  };
}

let ipCounter = 0;
async function call(handler, query) {
  const res = mockRes();
  ipCounter += 1;
  // A distinct client IP per call keeps the 60/min rate limiter out of the capture.
  await handler({ method: "GET", query, headers: { "x-forwarded-for": `10.99.${Math.floor(ipCounter / 250)}.${ipCounter % 250}` } }, res);
  return { status: res.statusCode, body: res.body, headers: res.headers };
}

/** @returns {Promise<Record<string, string>>} surface name -> sha256 */
export async function captureEdinburghSurface() {
  // The API handlers console.error every expected 503; keep the gate output readable.
  const originalError = console.error;
  console.error = () => {};
  try {
    return await captureSurface();
  } finally {
    console.error = originalError;
  }
}

async function captureSurface() {
  const raw = JSON.parse(readFileSync(join(ROOT, "lib", "cities", "edinburgh", "stations.json"), "utf8"));
  const tramStops = raw.stops.filter((s) => s.mode === "metro");
  const out = {};

  out["api/city-stations?city=edinburgh"] = sha(await call(cityStations, { city: "edinburgh" }));
  out["listMultiCityStations(edinburgh)"] = sha(listMultiCityStations("edinburgh"));
  out["uk catalog listCatalogStations(edinburgh)"] = sha(listCatalogStations("edinburgh"));
  out["uk catalog getRegion(edinburgh)"] = sha(getRegion("edinburgh"));
  out["dogfood listEdinburghDogfoodStations()"] = sha(listEdinburghDogfoodStations());

  const manifest = await call(cities, {});
  out["api/cities (edinburgh manifest entry)"] = sha((manifest.body?.cities ?? []).find((c) => c.id === "edinburgh"));
  out["public/city-directions/edinburgh.json bytes"] = sha(
    readFileSync(join(ROOT, "public", "city-directions", "edinburgh.json"), "utf8")
  );

  const country = await call(countryStations, { country: "united-kingdom" });
  out["api/country-stations?country=united-kingdom (edinburgh rows)"] = sha({
    status: country.status,
    region: (country.body?.regions ?? []).filter((r) => r.id === "edinburgh"),
    stations: (country.body?.stations ?? []).filter((s) => s.region?.id === "edinburgh"),
  });

  // Shared printed names (Haymarket, Edinburgh Gateway) resolve rail-first and would hit Darwin;
  // those are the rail path's business, not captured here.
  const railNames = new Set(raw.stops.filter((s) => s.mode === "train").map((s) => s.name.toLowerCase()));
  for (const stop of tramStops) {
    out[`findNearestStation(edinburgh) at ${stop.catalogId}`] = sha(
      findNearestStation("edinburgh", stop.lat, stop.lng)
    );
    if (railNames.has(stop.name.toLowerCase())) {
      continue;
    }
    out[`api/board?city=edinburgh&station=${stop.name} [metro entry ${stop.catalogId}]`] = sha(
      await call(board, { city: "edinburgh", station: stop.name })
    );
    out[`api/directions?city=edinburgh&station=${stop.name} [metro entry ${stop.catalogId}]`] = sha(
      await call(directions, { city: "edinburgh", station: stop.name })
    );
  }

  // Tram-only names (no rail namesake) must still throw the same typed error
  // from the multi-city directions entry point.
  for (const name of ["Newhaven", "Edinburgh Airport"]) {
    let shape;
    try {
      shape = { ok: await getMultiCityDirections("edinburgh", name) };
    } catch (error) {
      shape = { name: error?.name, code: error?.code, message: error?.message };
    }
    out[`getMultiCityDirections(edinburgh, ${name})`] = sha(shape);
  }
  return out;
}
