# Newcastle GTFS fixture

Dogfood NLR schedule (Interchange ↔ Beach). Live TfNSW `lightrail/newcastle` still needs `TFNSW_API_KEY`.

```
node scripts/trim-newcastle-gtfs.mjs --zip=qa/tmp/newcastle-nlr.zip
```


```
node scripts/trim-newcastle-gtfs.mjs --zip=qa/tmp/newcastle-nlr.zip
```

Does **not** write `published-network.json`. Official Newcastle Transport light rail map is the oracle.
