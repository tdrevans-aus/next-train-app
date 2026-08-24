# Tim — Brisbane sideload dogfood (debug APK)

**City status:** `planned` — **not live**. Not a Play/step-6 build.

**Done when:** sideload debug APK → **Near me** (or pick Central) → same hero/chips UI as Perth, real SEQ board. Same APK pointed at production cannot open Brisbane.

---

## On the PC

```powershell
$env:ALLOW_CITY_PROBES="1"
npm run dev
```

`dev-server.js` already binds `0.0.0.0:3000`. Allow Node through Windows Firewall for private networks if the phone cannot connect.

Confirm locally:

```powershell
curl "http://localhost:3000/api/dev/board?city=brisbane&station=Central"
```

Expect JSON with `cityStatus: "planned"` and `tripCount` ≥ 1 in service hours.

---

## Debug APK (sideload)

```powershell
npm run android:debug
```

Install `android/app/build/outputs/apk/debug/app-debug.apk`.

1. Phone and PC on the same Wi-Fi (not emulator? origin defaults to this PC’s LAN from `dogfood-origin.json`; emulator use `http://10.0.2.2:3000`).
2. Open the app — **Near me** (Logan Central mock → Woodridge / Trinder Park) or pick **Central** in the station picker.
3. Same chips + hero as Perth. Origin is this PC (`http://<lan-ip>:3000`).

Release/Play builds do **not** show BNE.

---

## Production must stay closed

| Path | Expect |
|------|--------|
| `/api/dev/board` on Vercel (preview or prod) | **404** always |
| `/api/next-train?city=brisbane&station=Central&direction=Ipswich` | **501** |
| `assertCityLive("brisbane")` | fail |
| Debug APK origin = `https://next-train-app.vercel.app` | BNE load → **404**, no board |

Do **not** set `ALLOW_CITY_PROBES` on Vercel.

---

## Monitoring

**Do not** add UptimeRobot / synthetic checks for Brisbane until Tim enables the city live.
