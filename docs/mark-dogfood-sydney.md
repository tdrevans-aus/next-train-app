# Tim — Sydney sideload city UI (debug APK)

**City status:** `planned` — **not live**. Do not flip Sydney or Brisbane. Perth stays green. Play live-flip is later.

**Done when:** debug APK + `npm run dev` + `ALLOW_CITY_PROBES=1` → Settings / first-launch city picker → Sydney → same hero/chips as Perth via local `/api/next-train?city=sydney`. Same APK against production cannot open Sydney.

---

## On the PC

Put `TFNSW_API_KEY` in `.env.local` only (already on Vercel Production + Preview; production next-train still **501** because the city is planned).

```powershell
$env:ALLOW_CITY_PROBES="1"
npm run dev
```

Confirm:

```powershell
curl "http://localhost:3000/api/next-train?city=sydney&station=Central&direction=T1%20Emu%20Plains"
```

Chips are **line + terminus** (`T1 Emu Plains`). City Circle is not a terminus. Central vs Central Metro stay disjoint.

---

## Debug APK

```powershell
npm run android:debug
```

1. Phone and PC on the same Wi-Fi (`dogfood-origin.json` / LAN). Emulator: `http://10.0.2.2:3000`.
2. First launch: location is a **hint** only. Pick Perth or Sydney. Saved city persists. Settings can change it.
3. If you already saved Perth and you are physically in Sydney (or the reverse), we **ask once**. We never silent-switch.
4. Melbourne / Adelaide / Canberra are not in the picker.

Release/Play against production: Sydney is not offered. `/api/next-train?city=sydney` stays **501**. `/api/dev/board` on Vercel stays **404**. Do **not** set `ALLOW_CITY_PROBES` on Vercel.

---

## Gates

- `node qa/sydney-dogfood-gate.mjs` — planned, Vercel board 404, probes off by default, Central vs Central Metro labels.
- Perth `qa/perth-static-directions.mjs` must stay green.
