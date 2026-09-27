# Luas stops from the published GTFS_LUAS snapshot (captured in CI, 27 Sep 2026)

Source: Publish GTFS snapshot run 36282006951 (ref flip-dublin-live, check_only, `--print-stops`),
reading `gtfs/dublin.zip` (from GTFS_LUAS.zip). 128 stop rows (one per platform/direction),
67 distinct stop names. Same run: GTFS-R join 5/5 (overnight, small sample).

Note the feed's spellings: `Abbey St.`, `O'Connell Upr.`, `O'Connell - GPO`, `Mayor Square` (no "- NCI"),
`Broadstone` (no "- University"), `Citywest` (no "Campus"), `Ballyogan` (no "Wood"),
`Leopardstown` (no "Valley"), `St. Stephen's Green`, `James's`, `Busáras`.

## Distinct names (67)

Abbey St., Balally, Ballyogan, Beechwood, Belgard, Blackhorse, Bluebell, Brides Glen, Broadstone, Broombridge, Busáras, Cabra, Carrickmines, Central Park, Charlemont, Cheeverstown, Cherrywood, Citywest, Connolly, Cookstown, Cowper, Dawson, Dominick, Drimnagh, Dundrum, Fatima, Fettercairn, Fortunestown, Four Courts, George's Dock, Glencairn, Goldenbridge, Grangegorman, Harcourt, Heuston, Hospital, James's, Jervis, Kilmacud, Kingswood, Kylemore, Laughanstown, Leopardstown, Marlborough, Mayor Square, Milltown, Museum, O'Connell - GPO, O'Connell Upr., Parnell, Phibsborough, Ranelagh, Red Cow, Rialto, Saggart, Sandyford, Smithfield, Spencer Dock, St. Stephen's Green, Stillorgan, Suir Road, Tallaght, The Gallops, The Point, Trinity, Westmoreland, Windy Arbour

## All rows

| stop_id | stop_name |
|---|---|
| 8220GA00361 | Bluebell |
| 8220GA00364 | Blackhorse |
| 8220GA00370 | Goldenbridge |
| 8220GA00376 | Rialto |
| 8220GA00379 | Fatima |
| 8220GA00401 | Four Courts |
| 8220GA00431 | Mayor Square |
| 8220GA00433 | Spencer Dock |
| 8220GA00437 | The Point |
| 8220GA00443 | Westmoreland |
| 8220GA00444 | O'Connell - GPO |
| 8220GA00479 | Grangegorman |
| 8220GA00480 | Cabra |
| 8230GA00344 | Tallaght |
| 8230GA00345 | Tallaght |
| 8230GA00354 | Red Cow |
| 8230GA00393 | Fettercairn |
| 8250GA00287 | Dundrum |
| 8250GA00293 | Sandyford |
| 8250GA00296 | Kilmacud |
| 8250GA00319 | Leopardstown |
| 8250GA00320 | Leopardstown |
| 8250GA00326 | Carrickmines |
| 8250GA00330 | Laughanstown |
| 8250GA00335 | Brides Glen |
| 8250GA00336 | Brides Glen |
| 8220GA00035 | Trinity |
| 8220GA00070 | Charlemont |
| 8220GA00276 | Cowper |
| 8220GA00278 | Milltown |
| 8220GA00367 | Drimnagh |
| 8220GA00369 | Goldenbridge |
| 8220GA00372 | Suir Road |
| 8220GA00373 | Suir Road |
| 8220GA00409 | Abbey St. |
| 8220GA00424 | Connolly |
| 8220GA00440 | Harcourt |
| 8220GA00459 | Broombridge |
| 8220GA00471 | Parnell |
| 8230GA00338 | Cookstown |
| 8230GA00392 | Fettercairn |
| 8230GA00396 | Cheeverstown |
| 8230GA00416 | Fortunestown |
| 8230GA00418 | Saggart |
| 8250GA00286 | Dundrum |
| 8250GA00291 | Balally |
| 8250GA00292 | Balally |
| 8250GA00310 | Central Park |
| 8250GA00311 | Central Park |
| 8250GA00313 | Glencairn |
| 8250GA00314 | Glencairn |
| 8250GA00316 | The Gallops |
| 8250GA00317 | The Gallops |
| 8250GA00329 | Laughanstown |
| 8220GA00034 | Marlborough |
| 8220GA00071 | Charlemont |
| 8220GA00083 | Beechwood |
| 8220GA00275 | Cowper |
| 8220GA00279 | Milltown |
| 8220GA00360 | Bluebell |
| 8220GA00366 | Drimnagh |
| 8220GA00378 | Fatima |
| 8220GA00381 | James's |
| 8220GA00382 | James's |
| 8220GA00402 | Four Courts |
| 8220GA00408 | Abbey St. |
| 8220GA00420 | Busáras |
| 8220GA00434 | Spencer Dock |
| 8220GA00436 | The Point |
| 8220GA00441 | Dawson |
| 8220GA00456 | Phibsborough |
| 8220GA00460 | Broombridge |
| 8220GA00469 | Cabra |
| 8220GA00470 | O'Connell Upr. |
| 8220GA00478 | Dominick |
| 8220GA00481 | Broadstone |
| 8230GA00339 | Cookstown |
| 8230GA00341 | Hospital |
| 8230GA00342 | Hospital |
| 8230GA00351 | Kingswood |
| 8230GA00395 | Cheeverstown |
| 8230GA00412 | Citywest |
| 8230GA00415 | Fortunestown |
| 8230GA00419 | Saggart |
| 8250GA00282 | Windy Arbour |
| 8250GA00294 | Sandyford |
| 8250GA00295 | Kilmacud |
| 8250GA00322 | Ballyogan |
| 8250GA00325 | Carrickmines |
| 8250GA00332 | Cherrywood |
| 8220GA00031 | Dawson |
| 8220GA00059 | St. Stephen's Green |
| 8220GA00062 | Harcourt |
| 8220GA00074 | Ranelagh |
| 8220GA00075 | Ranelagh |
| 8220GA00084 | Beechwood |
| 8220GA00058 | St. Stephen's Green |
| 8220GA00356 | Kylemore |
| 8220GA00357 | Kylemore |
| 8220GA00363 | Blackhorse |
| 8220GA00375 | Rialto |
| 8220GA00386 | Heuston |
| 8220GA00387 | Heuston |
| 8220GA00389 | Museum |
| 8220GA00390 | Museum |
| 8220GA00398 | Smithfield |
| 8220GA00399 | Smithfield |
| 8220GA00404 | Jervis |
| 8220GA00405 | Jervis |
| 8220GA00421 | Busáras |
| 8220GA00423 | Connolly |
| 8220GA00427 | George's Dock |
| 8220GA00428 | George's Dock |
| 8220GA00430 | Mayor Square |
| 8220GA00452 | Grangegorman |
| 8220GA00455 | Phibsborough |
| 8220GA00467 | Dominick |
| 8220GA00468 | Broadstone |
| 8230GA00347 | Belgard |
| 8230GA00348 | Belgard |
| 8230GA00350 | Kingswood |
| 8230GA00353 | Red Cow |
| 8230GA00413 | Citywest |
| 8250GA00281 | Windy Arbour |
| 8250GA00297 | Stillorgan |
| 8250GA00298 | Stillorgan |
| 8250GA00323 | Ballyogan |
| 8250GA00333 | Cherrywood |
