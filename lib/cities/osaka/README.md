# Osaka (Osaka Metro) station catalog

Official-map catalog for city id `osaka`. **Not** wired to a live board. City stays **planned**. Picker shows **Coming Soon**. `adapterReady` is **false**. Do not flip live.

- City id: **osaka**. Display **Osaka**. Not osk. Not osaka-metro. Not kintetsu. Not city=japan. Not Tokyo. Not Keihanshin.
- Inner-city lock: **Hommachi** (M18 × Y13 × C16). Official transfers are **Yotsubashi + Chuo** only.
- Do not lock **Umeda**, **Namba**, **Shinsaibashi**, **Sakaisuji-Hommachi**, **Tennoji**, or Downtown.
- v1: eight subway lines only (Midosuji, Tanimachi, Yotsubashi, Chuo, Sennichimae, Sakaisuji, Nagahori Tsurumi-ryokuchi, Imazatosuji). **101** unique official EN names. New Tram / Nanko Port Town out. Kitakyu north of Esaka out.
- Time zone: `Asia/Tokyo` (no DST).
- Feed: **no official public GTFS or GTFS-RT**. Transitland 0 hits. Mobility Database 0 Osaka Metro rows. Osaka Metro is not an ODPT member. Do not invent an ODPT zip. Live path is unverified HTML 列車走行位置 pages, not a product contract. No env key.
- Direction: line + terminus (`Midosuji + Nakamozu`). Not inbound/outbound. Never “to City”.

D1 pack: `docs/osaka-d1/`. D2 fixture: `qa/fixtures/osaka/published-network.json` is a verbatim copy of that JSON. Do not generate it from GTFS.
