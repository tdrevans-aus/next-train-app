# Rotterdam GTFS fixture

Trimmed from OVapi `gtfs-nl.zip` to **RET metro** routes A–E (`route_type` 1, agency RET). Excludes tram, bus, waterbus, NS, and GVB M50–M54.

```
node scripts/trim-rotterdam-gtfs.mjs --zip=qa/tmp/gtfs-nl.zip
```

Uses User-Agent `next-train`. Does **not** write `published-network.json`. Official RET Metrolijnenkaart is the oracle.
