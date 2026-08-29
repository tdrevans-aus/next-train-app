Osaka D1 official-map pack + planned-city D2–D6 wiring. City stays **planned**. Picker shows **Osaka (Coming Soon)** under Japan (`jp`). Perth/Sydney/Brisbane/Amsterdam/Rotterdam live-gates untouched. Stockholm / Göteborg stay Coming Soon. **assertCityLive("osaka") must still fail.** adapterReady **false**. No official public feed. No generator. Do not invent city=japan, osk, osaka-metro, kintetsu, or merge into Tokyo / Keihanshin.

Drop later (already copied as D2): qa/fixtures/osaka/published-network.json. Research pack is docs/osaka-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

D1 = official Osaka Metro **EN routes / station list** https://subway.osakametro.co.jp/en/station_guide/ plus **2025-04-04 路線図** https://subway.osakametro.co.jp/img/osakametro_rosenzu_20250404.pdf linked from https://subway.osakametro.co.jp/en/guide/routemap.php . **Hand-transcribed. Not generated from GTFS.**

Modes v1: subway / metro only — eight official subway lines (**Midosuji, Tanimachi, Yotsubashi, Chuo, Sennichimae, Sakaisuji, Nagahori Tsurumi-ryokuchi, Imazatosuji**). **101** unique official EN names. **124** line ticks. New Tram / Nanko Port Town out. Kitakyu north of Esaka out. City id is **osaka**. Display **Osaka**. Agency **Osaka Metro**.

C2/C3: (1) Lock **Hommachi** (M18 × Y13 × C16). Official transfers Yotsubashi + Chuo only. (2) Do not lock Umeda / Namba / Shinsaibashi / Sakaisuji-Hommachi / Tennoji / Downtown. (3) doNotGroup Hommachi vs Sakaisuji-Hommachi; Umeda vs Higashi-Umeda vs Nishi-Umeda vs Hankyu / Hanshin / JR Osaka; Namba vs Nankai / JR / Kintetsu / Hanshin Namba; Shinsaibashi vs Yotsubashi; Esaka vs Kitakyu Senri-Chuo / Minoh-Kayano; Nagata vs Kintetsu beyond Nagata. (4) Yumeshima C09 is IN. (5) Preserve official EN spellings (Higashimikuni, Minamimorimachi, Nishinagahori, Nippombashi, Gamo 4-chome). **Do not merge into Tokyo.**

H2: **No official public GTFS / GTFS-RT.** Transitland 0 hits. Mobility Database 0 Osaka Metro rows. Osaka Metro is not an ODPT member as of 1 Aug 2026. Do not invent an ODPT zip because Tokyo Metro has one. Live path is unverified HTML 列車走行位置 pages, not a product contract. **envKeys: none. adapterReady: false.** Registry integration must say there is no official public feed.

H7: **Asia/Tokyo has NO DST.** Do not copy Europe/Stockholm DST cities.

§3 rec: **line + terminus** (`Midosuji + Nakamozu`, `Chuo + Yumeshima`). Never “to City”. Do not flip osaka live. Not a public store listing.
