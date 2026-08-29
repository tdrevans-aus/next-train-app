Hong Kong D1 official-map pack + planned-city D2–D6 wiring. City stays **planned**. Picker shows **Hong Kong (Coming Soon)** under Hong Kong (`hk`). Perth/Sydney/Brisbane/Amsterdam/Rotterdam live-gates untouched. Stockholm / Göteborg stay Coming Soon. **assertCityLive("hong-kong") must still fail (501).** adapterReady **false**. Next Train REST exists and is **not wired**. No generator. Do not invent city=hk, mtr, kowloon, or merge Light Rail / Airport Express into a second city. Not China as the country.

Drop later (already copied as D2): qa/fixtures/hong-kong/published-network.json. Research pack is docs/hong-kong-d1/: published-network.json, oracle-clash-report.md, hazard-pack.md, direction-model-memo.md, jim-handoff.md.

D1 = official MTR **system map** https://www.mtr.com.hk/en/customer/services/system_map.html + **routemap.pdf** https://www.mtr.com.hk/archive/en/services/routemap.pdf (Last-Modified 11 Sep 2024) + official EN homepage line lists + corporate Railway Network termini https://www.mtr.com.hk/en/corporate/operations/detail_network.html . Next Train spec v1.7 is **codes only**, not the map oracle. **Hand-transcribed. Not generated from GTFS.** Not generated from the Transport Department all-modes zip.

Modes v1: metro / urban heavy-rail only — eight official lines (**Island, Tsuen Wan, Kwun Tong, Tseung Kwan O, Tung Chung, Tuen Ma, East Rail, South Island**). **95** unique official EN names. **114** line ticks. Airport Express out. Disneyland Resort out. Light Rail out. High Speed Rail out. City id is **hong-kong**. Display **Hong Kong**. Agency **MTR Corporation Limited**.

C2/C3: (1) Lock **Admiralty** (TWL × ISL × SIL × EAL, spec ADM). (2) Do not lock Central / Tsim Sha Tsui / East Tsim Sha Tsui / Hung Hom / Kowloon / Hong Kong station / Hong Kong West Kowloon / Downtown. (3) doNotGroup Admiralty vs Central; Tsim Sha Tsui vs East Tsim Sha Tsui; Hung Hom vs Kowloon vs Hong Kong station vs Hong Kong West Kowloon; Mong Kok vs Mong Kok East; Tsuen Wan vs Tsuen Wan West. (4) Lo Wu / Lok Ma Chau are IN. LOHAS Park is IN as the TKL branch. (5) Preserve official EN spellings (HKU, LOHAS Park, Sung Wong Toi, East Tsim Sha Tsui, Mong Kok East). **Do not merge into China.**

H2: **MTR Next Train REST exists** — empty-key GET https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php (`line` + `sta`). Verified 200 on ISL/TWL/EAL/SIL at ADM, TML at HUH, AEL at HOK. **Not wired.** AEL on the same REST is the trap. Transport Department all-modes GTFS is not an MTR-only subway feed. **envKeys: none. adapterReady: false.** Registry integration must name that REST and say it is not wired.

H7: **Asia/Hong_Kong has NO DST.** Do not copy Europe/Stockholm DST cities.

§3 rec: **line + terminus** (`Island + Chai Wan`, `Tseung Kwan O + Po Lam / LOHAS Park`, `East Rail + Lo Wu / Lok Ma Chau`). Never “to City”. Do not flip hong-kong live. Not a public store listing. Skip D6 as a PR gate.
