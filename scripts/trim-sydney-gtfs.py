#!/usr/bin/env python3
"""D3 — Trim Sydney Trains + Metro + NSW TrainLink intercity GTFS for offline Sydney conformance."""

from __future__ import annotations

import csv
import io
import sys
import zipfile
from datetime import date
from pathlib import Path

# Round 2 (15 Sep 2026, docs/jim-brief-sydney-intercity-fill.md): this script now takes THREE
# zips — the same authenticated gateway sources lib/providers/sydney.js reads at runtime
# (scripts/download-sydney-gtfs-zips.mjs fetches them) — instead of the single unauthenticated
# "full_greater_sydney_gtfs_static_0.zip" public bulk dataset Round 1 assumed. That switch
# surfaced two real findings, verified against the live feeds with TFNSW_API_KEY:
#
# 1. The walk-up intercity/Hunter codes (BMT/CCN/SCO/SHL/HUN) AND the compulsory-reservation
#    NSW TrainLink corridors (NRC/NRW/STH/WST) are published together under the *sydneytrains*
#    zip's routes.txt (agency_id "NSWTrains", route_type "2") — not the standalone nswtrains
#    zip, where BMT/HUN/SCO/SHL sit at route_type "100" (excluded by KEEP_SHORT's route_type
#    check below) and CCN doesn't appear at all. So EXCLUDE_SHORT is applied to the sydneytrains
#    zip's routes, not the nswtrains zip's.
# 2. The nswtrains zip's own rail-typed (route_type "2") content is empty as a result — it
#    contributes nothing to routes/trips/stop_times here. It is still passed through this
#    trim for schema symmetry with the runtime merge (lib/providers/sydney.js's
#    loadSydneyStatic()) and in case TfNSW ever moves a corridor's route_type; if it stays
#    empty, that isn't a bug in this script.
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "qa" / "fixtures" / "sydney" / "gtfs"

RAIL_ROUTE_TYPE = "2"
METRO_ROUTE_TYPE = "401"
SYDNEYTRAINS_KEEP_SHORT = {f"T{i}" for i in range(1, 10)} | {"BMT", "CCN", "SCO", "SHL", "HUN"}
# Verified 15 Sep 2026 against routes.txt — must stay in sync with
# NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES in lib/providers/sydney.js.
EXCLUDE_SHORT = {"NRC", "NRW", "STH", "WST"}

# Explicit column allow-lists — only fields actually read anywhere in
# lib/, scripts/, or qa/ (see docs/jim-brief-gtfs-fixture-diet.md). Keeps
# the checked-in fixture slim on every regeneration instead of carrying
# every upstream GTFS column through as a pass-through.
STOP_TIME_COLUMNS = ["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "pickup_type"]
TRIP_COLUMNS = ["route_id", "service_id", "trip_id", "trip_headsign"]


def text(zf: zipfile.ZipFile, name: str):
    try:
        raw = zf.open(name)
    except KeyError:
        return None
    return io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")


def write_csv(path: Path, rows: list[dict], fieldnames: list[str] | None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not fieldnames:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def route_included(row: dict, *, source: str) -> bool:
    route_type = row.get("route_type")
    short = (row.get("route_short_name") or "").strip()
    if short in EXCLUDE_SHORT:
        return False
    if source == "metro":
        return route_type == METRO_ROUTE_TYPE
    if source == "sydneytrains":
        return route_type == RAIL_ROUTE_TYPE and short in SYDNEYTRAINS_KEEP_SHORT
    if source == "nswtrains":
        # See the Round 2 note above — this is expected to match nothing today.
        return route_type == RAIL_ROUTE_TYPE
    raise ValueError(f"unknown source {source!r}")


def trim_one(zip_path: Path, source: str) -> dict:
    """Trim a single source zip to its in-scope routes/trips/stops/calendar/agency rows."""
    with zipfile.ZipFile(zip_path) as zf:
        with text(zf, "routes.txt") as handle:
            route_rows = list(csv.DictReader(handle))
            route_fields = list(route_rows[0].keys()) if route_rows else []

        rail_routes = [row for row in route_rows if route_included(row, source=source)]
        rail_route_ids = {row["route_id"] for row in rail_routes}

        with text(zf, "trips.txt") as handle:
            trip_reader = csv.DictReader(handle)
            trip_fields = [name for name in TRIP_COLUMNS if name in (trip_reader.fieldnames or [])]
            rail_trips = [row for row in trip_reader if row["route_id"] in rail_route_ids]
        rail_trip_ids = {row["trip_id"] for row in rail_trips}
        used_service_ids = {row["service_id"] for row in rail_trips}

        used_stop_ids: set[str] = set()
        stop_time_fields: list[str] = []
        stop_time_rows: list[dict] = []
        with text(zf, "stop_times.txt") as handle:
            reader = csv.DictReader(handle)
            stop_time_fields = [name for name in STOP_TIME_COLUMNS if name in (reader.fieldnames or [])]
            for row in reader:
                if row["trip_id"] not in rail_trip_ids:
                    continue
                stop_time_rows.append(row)
                used_stop_ids.add(row["stop_id"])

        with text(zf, "stops.txt") as handle:
            stop_reader = csv.DictReader(handle)
            stop_fields = list(stop_reader.fieldnames or [])
            all_stops = list(stop_reader)
        by_id = {row["stop_id"]: row for row in all_stops}
        children_by_parent: dict[str, list[str]] = {}
        for row in all_stops:
            parent = row.get("parent_station") or ""
            if parent:
                children_by_parent.setdefault(parent, []).append(row["stop_id"])

        extra: set[str] = set()
        for stop_id in list(used_stop_ids):
            parent = by_id.get(stop_id, {}).get("parent_station") or ""
            if parent:
                extra.add(parent)
                extra.update(children_by_parent.get(parent, []))
            extra.update(children_by_parent.get(stop_id, []))
        used_stop_ids.update(extra)

        rail_stops = [row for row in all_stops if row["stop_id"] in used_stop_ids]

        calendar_rows: list[dict] = []
        calendar_fields: list[str] = []
        cal_handle = text(zf, "calendar.txt")
        if cal_handle:
            with cal_handle as handle:
                reader = csv.DictReader(handle)
                calendar_fields = list(reader.fieldnames or [])
                calendar_rows = [row for row in reader if row["service_id"] in used_service_ids]

        dates_rows: list[dict] = []
        dates_fields: list[str] = []
        dates_handle = text(zf, "calendar_dates.txt")
        if dates_handle:
            with dates_handle as handle:
                reader = csv.DictReader(handle)
                dates_fields = list(reader.fieldnames or [])
                dates_rows = [row for row in reader if row["service_id"] in used_service_ids]

        agency_rows: list[dict] = []
        agency_fields: list[str] = []
        agency_handle = text(zf, "agency.txt")
        if agency_handle:
            with agency_handle as handle:
                agency_rows = list(csv.DictReader(handle))
                agency_fields = list(agency_rows[0].keys()) if agency_rows else []
        used_agencies = {row.get("agency_id") for row in rail_routes}
        agency_rows = [row for row in agency_rows if row.get("agency_id") in used_agencies]

        feed_rows: list[dict] = []
        feed_fields: list[str] = []
        feed_handle = text(zf, "feed_info.txt")
        if feed_handle:
            with feed_handle as handle:
                feed_rows = list(csv.DictReader(handle))
                feed_fields = list(feed_rows[0].keys()) if feed_rows else []

    return {
        "route_rows": rail_routes,
        "route_fields": route_fields,
        "trip_rows": rail_trips,
        "trip_fields": trip_fields,
        "stop_time_rows": stop_time_rows,
        "stop_time_fields": stop_time_fields,
        "stop_rows": rail_stops,
        "stop_fields": stop_fields,
        "calendar_rows": calendar_rows,
        "calendar_fields": calendar_fields,
        "dates_rows": dates_rows,
        "dates_fields": dates_fields,
        "agency_rows": agency_rows,
        "agency_fields": agency_fields,
        "feed_rows": feed_rows,
        "feed_fields": feed_fields,
    }


def merge_field_lists(*field_lists: list[str]) -> list[str]:
    merged: list[str] = []
    for fields in field_lists:
        for f in fields:
            if f not in merged:
                merged.append(f)
    return merged


def merge_rows(key: str, *parts: dict) -> tuple[list[dict], list[str]]:
    rows: list[dict] = []
    seen_ids: set[str] = set()
    fields = merge_field_lists(*[p[f"{key}_fields"] for p in parts])
    id_field = {
        "route": "route_id",
        "trip": "trip_id",
        "stop_time": None,
        "stop": "stop_id",
        "calendar": "service_id",
        "dates": None,
        "agency": "agency_id",
        "feed": None,
    }[key]
    for part in parts:
        for row in part[f"{key}_rows"]:
            if id_field:
                rid = row.get(id_field)
                if rid in seen_ids:
                    continue
                seen_ids.add(rid)
            rows.append(row)
    return rows, fields


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: python scripts/trim-sydney-gtfs.py "
            "<sydneytrains.zip> <metro.zip> <nswtrains.zip>\n"
            "Download these three with: node scripts/download-sydney-gtfs-zips.mjs <dir>"
        )

    sydneytrains_zip = Path(sys.argv[1])
    metro_zip = Path(sys.argv[2])
    nswtrains_zip = Path(sys.argv[3])
    for p in (sydneytrains_zip, metro_zip, nswtrains_zip):
        if not p.is_file():
            raise SystemExit(f"Not a file: {p}")

    sydneytrains = trim_one(sydneytrains_zip, "sydneytrains")
    metro = trim_one(metro_zip, "metro")
    nswtrains = trim_one(nswtrains_zip, "nswtrains")

    route_rows, route_fields = merge_rows("route", sydneytrains, metro, nswtrains)
    trip_rows, trip_fields = merge_rows("trip", sydneytrains, metro, nswtrains)
    stop_time_rows = sydneytrains["stop_time_rows"] + metro["stop_time_rows"] + nswtrains["stop_time_rows"]
    stop_time_fields = merge_field_lists(
        sydneytrains["stop_time_fields"], metro["stop_time_fields"], nswtrains["stop_time_fields"]
    )
    stop_rows, stop_fields = merge_rows("stop", sydneytrains, metro, nswtrains)
    calendar_rows, calendar_fields = merge_rows("calendar", sydneytrains, metro, nswtrains)
    dates_rows = sydneytrains["dates_rows"] + metro["dates_rows"] + nswtrains["dates_rows"]
    dates_fields = merge_field_lists(
        sydneytrains["dates_fields"], metro["dates_fields"], nswtrains["dates_fields"]
    )
    agency_rows, agency_fields = merge_rows("agency", sydneytrains, metro, nswtrains)
    # feed_info: keep sydneytrains's if present, else whichever has one
    feed_rows = sydneytrains["feed_rows"] or metro["feed_rows"] or nswtrains["feed_rows"]
    feed_fields = sydneytrains["feed_fields"] or metro["feed_fields"] or nswtrains["feed_fields"]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_csv(OUT_DIR / "agency.txt", agency_rows, agency_fields)
    write_csv(OUT_DIR / "feed_info.txt", feed_rows, feed_fields)
    write_csv(OUT_DIR / "routes.txt", route_rows, route_fields)
    write_csv(OUT_DIR / "trips.txt", trip_rows, trip_fields)
    write_csv(OUT_DIR / "stop_times.txt", stop_time_rows, stop_time_fields)
    write_csv(OUT_DIR / "stops.txt", stop_rows, stop_fields)
    write_csv(OUT_DIR / "calendar.txt", calendar_rows, calendar_fields)
    write_csv(OUT_DIR / "calendar_dates.txt", dates_rows, dates_fields)

    start = feed_rows[0].get("feed_start_date") if feed_rows else "?"
    end = feed_rows[0].get("feed_end_date") if feed_rows else "?"
    if start == "?":
        start = calendar_rows[0].get("start_date") if calendar_rows else "?"
        end = calendar_rows[0].get("end_date") if calendar_rows else "?"

    readme = f"""# Sydney GTFS fixture (T1-T9 + M + NSW TrainLink intercity/Hunter)

**Sources (authenticated TfNSW gateway, via scripts/download-sydney-gtfs-zips.mjs):**
- https://api.transport.nsw.gov.au/v1/gtfs/schedule/sydneytrains
- https://api.transport.nsw.gov.au/v1/gtfs/schedule/metro
- https://api.transport.nsw.gov.au/v1/gtfs/schedule/nswtrains

**Trimmed:** {date.today().isoformat()}
**Feed span:** {start} -> {end}

## Regenerate

```bash
node scripts/download-sydney-gtfs-zips.mjs /path/to/tmp-dir
python scripts/trim-sydney-gtfs.py /path/to/tmp-dir/sydneytrains-static.zip /path/to/tmp-dir/metro-static.zip /path/to/tmp-dir/nswtrains-static.zip
node scripts/build-line-map.mjs --city=sydney
node scripts/publish-gtfs-fixture-to-blob.mjs sydney --allow-live
```

## Trim rules

- sydneytrains.zip: `route_type` "2" AND `route_short_name` in T1-T9, BMT, CCN, SCO, SHL, HUN
  (walk-up intercity/Hunter). NRC/NRW/STH/WST (compulsory-reservation NSW TrainLink corridors,
  same zip, same route_type) are explicitly excluded — see
  docs/sydney-d1/board-eligibility-intercity.md.
- metro.zip: `route_type` "401" only.
- nswtrains.zip: `route_type` "2" only — verified 15 Sep 2026 to match nothing (BMT/HUN/SCO/SHL
  are `route_type` "100" in this feed and CCN is absent), kept for schema symmetry with
  lib/providers/sydney.js's loadSydneyStatic() and in case TfNSW changes this later.
- No light rail, ferry, bus, or NSW TrainLink coach/regional-reservation routes.
- Trips, stop_times, calendar rows restricted to those routes.
- Parent stations and all child platform stops retained for used stops.
- `shapes.txt` omitted.
"""
    (OUT_DIR / "README.md").write_text(readme, encoding="utf-8")

    print(f"Wrote rail fixture to {OUT_DIR}")
    print(
        f"routes={len(route_rows)} trips={len(trip_rows)} stops={len(stop_rows)} "
        f"stop_times={len(stop_time_rows)}"
    )
    print(
        f"  sydneytrains: routes={len(sydneytrains['route_rows'])} trips={len(sydneytrains['trip_rows'])}"
    )
    print(f"  metro:        routes={len(metro['route_rows'])} trips={len(metro['trip_rows'])}")
    print(
        f"  nswtrains:    routes={len(nswtrains['route_rows'])} trips={len(nswtrains['trip_rows'])} "
        "(expected 0, see Round 2 note above)"
    )


if __name__ == "__main__":
    main()
