# Dublin: CI evidence for the published Luas static snapshot (26 Sep 2026)

Pulled from GitHub Actions by the top-level session, because Claude sandboxes can't reach
transportforireland.ie or the blob store.

- Source: `https://www.transportforireland.ie/transitData/Data/GTFS_LUAS.zip`. `GTFS_All.zip` has
  no Luas routes (CI run 36228663901 found only 11 Dublin Bus routes naming Luas stops).
- Publish GTFS snapshot, run 36232824869 on commit 16e9178 (merged as PR #460, aea925a):
  - trim: `routes=2 trips=2935 stops=128 stop_times=63488`, 0.44 MB zipped, published to `gtfs/dublin.zip`
  - routes.txt: `10000 GREEN g a | 10000 | Green | Parnell - Brides Glen | 0` and
    `10000 RED g a | 10000 | Red | The Point - Tallaght | 0`
  - agency.txt: `10000 | LUAS`
  - distinct stops used by kept trips: 128. The Tallaght and Broombridge termini are both present.
- Not yet verified: whether NTA GTFS-R v2 trip_ids join to this feed's trip_ids (the live half).
  That needs NTA_API_KEY, which is set in Vercel production, so a sandbox can't test it.
