/**
 * Per-mode service freshness for a merged multi-mode GTFS snapshot (docs/jim-brief-sydney-metro-stale-and-refresh-cadence.md).
 *
 * Sydney's snapshot merges sydneytrains + metro (+ intercity). A single overall calendar range
 * hides a stale mode: on 21 Nov 2026 the snapshot read 20240915..20261220 while its whole Metro
 * section was a 2024 feed with no service today. This asks the per-mode question instead: does
 * each mode that has trips in the snapshot have at least one trip whose service runs on `today`?
 */
import { parseCsv } from "./csv.js";

const DAY_COLUMNS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** route_type 1 / 401 (metro) -> "metro"; everything else in a Sydney snapshot is heavy rail. */
export function sydneyModeOfRoute(route) {
  const type = String(route.route_type ?? "").trim();
  return type === "401" || type === "1" ? "metro" : "trains";
}

/** YYYYMMDD and weekday index (0=Sunday) of `now` in `timeZone`. */
export function localDateParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })
    .formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const ymd = `${get("year")}${get("month")}${get("day")}`;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { ymd, weekday };
}

/**
 * @param {{ routesText: string, tripsText: string, calendarText?: string, calendarDatesText?: string }} files
 * @param {{ now: Date, timeZone: string, modeOfRoute?: (route: object) => string }} options
 * @returns {{ today: string, modes: Record<string, { trips: number, activeTrips: number, maxDate: string|null }>, staleModes: string[] }}
 */
export function checkModeFreshness(files, { now, timeZone, modeOfRoute = sydneyModeOfRoute }) {
  const { ymd, weekday } = localDateParts(now, timeZone);
  const modeByRoute = new Map();
  for (const route of parseCsv(files.routesText ?? "")) {
    modeByRoute.set(route.route_id, modeOfRoute(route));
  }

  const activeServices = new Set();
  const maxDateByService = new Map();
  const bump = (serviceId, date) => {
    if (date && (maxDateByService.get(serviceId) ?? "") < date) maxDateByService.set(serviceId, date);
  };
  for (const row of parseCsv(files.calendarText ?? "")) {
    bump(row.service_id, row.end_date);
    if (row.start_date <= ymd && ymd <= row.end_date && String(row[DAY_COLUMNS[weekday]]).trim() === "1") {
      activeServices.add(row.service_id);
    }
  }
  for (const row of parseCsv(files.calendarDatesText ?? "")) {
    bump(row.service_id, row.date);
    if (row.date !== ymd) continue;
    if (row.exception_type === "1") activeServices.add(row.service_id);
    if (row.exception_type === "2") activeServices.delete(row.service_id);
  }

  const modes = {};
  for (const trip of parseCsv(files.tripsText ?? "")) {
    const mode = modeByRoute.get(trip.route_id);
    if (!mode) continue;
    const entry = (modes[mode] ??= { trips: 0, activeTrips: 0, maxDate: null });
    entry.trips += 1;
    if (activeServices.has(trip.service_id)) entry.activeTrips += 1;
    const end = maxDateByService.get(trip.service_id) ?? null;
    if (end && (entry.maxDate === null || end > entry.maxDate)) entry.maxDate = end;
  }
  const staleModes = Object.entries(modes).filter(([, m]) => m.activeTrips === 0).map(([name]) => name).sort();
  return { today: ymd, modes, staleModes };
}

/** Same check over a zip's unzipped files (name -> Uint8Array), as fflate's unzipSync returns. */
export function checkModeFreshnessFromFiles(files, options) {
  const decoder = new TextDecoder("utf-8");
  const text = (name) => {
    const key = Object.keys(files).find((k) => k === name || k.endsWith(`/${name}`));
    return key ? decoder.decode(files[key]) : "";
  };
  return checkModeFreshness(
    {
      routesText: text("routes.txt"),
      tripsText: text("trips.txt"),
      calendarText: text("calendar.txt"),
      calendarDatesText: text("calendar_dates.txt"),
    },
    options
  );
}
