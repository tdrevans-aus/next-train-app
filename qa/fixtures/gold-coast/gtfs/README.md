# Gold Coast GTFS fixture

Trimmed from TransLink SEQ `SEQ_GTFS.zip` to **G:link L1** (`route_type` 0, short name `L1`). Excludes bus 70, SEQ trains, and ferries.

```
node scripts/trim-gold-coast-gtfs.mjs --zip=qa/tmp/seq-gtfs.zip
```

Does **not** write `published-network.json`. Official G:link map is the oracle.
