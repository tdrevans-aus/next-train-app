# Canberra GTFS fixture

Trimmed from public CMO `google_transit_lr.zip` to **route 1** only (no buses, no NIS/X1/X2).

```
node scripts/trim-canberra-gtfs.mjs --zip=qa/tmp/canberra-lr.zip
```

Does **not** write `published-network.json`. Official Stage 1 map is the oracle.
