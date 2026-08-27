# Vancouver GTFS fixture

Trimmed from TransLink `https://gtfs-static.translink.ca/gtfs/google_transit.zip` to **SkyTrain** (`route_type` 1: Expo, Millennium, Canada Line).

```
node scripts/trim-vancouver-gtfs.mjs --zip=qa/tmp/translink-gtfs.zip
```

Does **not** write `published-network.json`. Official TransLink SkyTrain map is the oracle.
