# Amsterdam GTFS fixture

Trimmed from OVapi `gtfs-nl.zip` to **GVB metro** routes 50–54 (`route_type` 1).

```
node scripts/trim-amsterdam-gtfs.mjs --zip=qa/tmp/gtfs-nl.zip
```

Uses User-Agent `next-train`. Does **not** write `published-network.json`.
