#!/usr/bin/env python3
"""D3 — Trim Greater Sydney GTFS to T1–T9 + M1 for offline Sydney conformance."""

from __future__ import annotations

import csv
import io
import sys
import zipfile
from datetime import date
from pathlib import Path

# KNOWN GAP (14 Sep 2026, docs/jim-brief-sydney-intercity-fill.md): this script only ever
# took one input zip (the sydneytrains static feed). It does not merge the separate
# nswtrains feed (v1/gtfs/schedule/nswtrains), so the BMT/CCN/SCO/SHL/HUN routes added to
# lib/providers/sydney.js and the catalog in that brief are NOT in the Blob-published
# gtfs/sydney.zip that lib/cities/sydney/dogfood-next-train.js's boardFromFixture() reads on
# Vercel (process.env.VERCEL === "1") — that is the actual production board path, not
# fetchStationBoard()'s live TfNSW call. Making the intercity fill visible in production
# needs: (1) a real nswtrains zip (requires TFNSW_API_KEY, not present in the build
# environment this session ran in), (2) extending this script (or a new sibling) to merge it
# in, keeping BMT/CCN/SCO/SHL/HUN and excluding NSWTRAINS_EXCLUDED_ROUTE_SHORT_NAMES from
# lib/providers/sydney.js, and (3) republishing via
# scripts/publish-gtfs-fixture-to-blob.mjs sydney --allow-live. Flagged rather than guessed
# at blind — this session had no zip to test a merge against.
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "qa" / "fixtures" / "sydney" / "gtfs"
KEEP_SHORT = {f"T{i}" for i in range(1, 10)} | {"M1", "BMT", "CCN", "SCO", "SHL", "HUN"}

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


def main() -> None:
    zip_path = Path(sys.argv[1] if len(sys.argv) > 1 else "")
    if not zip_path.is_file():
        raise SystemExit(
            "Usage: python scripts/trim-sydney-gtfs.py <full_greater_sydney_gtfs_static_0.zip>"
        )

    source_url = (
        "https://opendata.transport.nsw.gov.au/data/dataset/"
        "d1f68d4f-b778-44df-9823-cf2fa922e47f/resource/"
        "67974f14-01bf-47b7-bfa5-c7f2f8a950ca/download/full_greater_sydney_gtfs_static_0.zip"
    )

    with zipfile.ZipFile(zip_path) as zf:
        with text(zf, "routes.txt") as handle:
            route_rows = list(csv.DictReader(handle))
            route_fields = list(route_rows[0].keys()) if route_rows else []

        rail_routes = [row for row in route_rows if row.get("route_short_name") in KEEP_SHORT]
        rail_route_ids = {row["route_id"] for row in rail_routes}

        with text(zf, "trips.txt") as handle:
            trip_reader = csv.DictReader(handle)
            trip_fields = [name for name in TRIP_COLUMNS if name in (trip_reader.fieldnames or [])]
            rail_trips = [row for row in trip_reader if row["route_id"] in rail_route_ids]
        rail_trip_ids = {row["trip_id"] for row in rail_trips}
        used_service_ids = {row["service_id"] for row in rail_trips}

        used_stop_ids: set[str] = set()
        stop_time_fields: list[str] = []
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        stop_times_path = OUT_DIR / "stop_times.txt"
        stop_time_count = 0
        with text(zf, "stop_times.txt") as handle, stop_times_path.open(
            "w", encoding="utf-8", newline=""
        ) as out:
            reader = csv.DictReader(handle)
            stop_time_fields = [name for name in STOP_TIME_COLUMNS if name in (reader.fieldnames or [])]
            writer = csv.DictWriter(out, fieldnames=stop_time_fields, extrasaction="ignore")
            writer.writeheader()
            for row in reader:
                if row["trip_id"] not in rail_trip_ids:
                    continue
                writer.writerow(row)
                used_stop_ids.add(row["stop_id"])
                stop_time_count += 1

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

    write_csv(OUT_DIR / "agency.txt", agency_rows, agency_fields)
    write_csv(OUT_DIR / "feed_info.txt", feed_rows, feed_fields)
    write_csv(OUT_DIR / "routes.txt", rail_routes, route_fields)
    write_csv(OUT_DIR / "trips.txt", rail_trips, trip_fields)
    write_csv(OUT_DIR / "stops.txt", rail_stops, stop_fields)
    write_csv(OUT_DIR / "calendar.txt", calendar_rows, calendar_fields)
    write_csv(OUT_DIR / "calendar_dates.txt", dates_rows, dates_fields)

    start = feed_rows[0].get("feed_start_date") if feed_rows else "?"
    end = feed_rows[0].get("feed_end_date") if feed_rows else "?"
    if start == "?":
        start = calendar_rows[0].get("start_date") if calendar_rows else "?"
        end = calendar_rows[0].get("end_date") if calendar_rows else "?"

    readme = f"""# Sydney GTFS fixture (T1–T9 + M1)

**Source:** {source_url}
**Trimmed:** {date.today().isoformat()}
**Feed span:** {start} → {end}

Public Greater Sydney complete zip (no `TFNSW_API_KEY`). Gateway schedule/RT URLs still 401 without a key.

## Regenerate

```bash
python scripts/trim-sydney-gtfs.py /path/to/full_greater_sydney_gtfs_static_0.zip
node scripts/build-line-map.mjs --city=sydney
```

## Trim rules

- `route_short_name` in T1–T9 and M1 only (Sydney Trains + Metro)
- No light rail, ferry, bus, or NSW TrainLink regional
- M1 in this zip is `route_type` 401 (not GTFS subway 1)
- T1–T9 are `route_type` 2
- Trips, stop_times, calendar rows restricted to those routes
- Parent stations and all child platform stops retained for used stops
- `shapes.txt` omitted
"""
    (OUT_DIR / "README.md").write_text(readme, encoding="utf-8")

    print(f"Wrote rail fixture to {OUT_DIR}")
    print(
        f"routes={len(rail_routes)} trips={len(rail_trips)} stops={len(rail_stops)} "
        f"stop_times={stop_time_count}"
    )


if __name__ == "__main__":
    main()
