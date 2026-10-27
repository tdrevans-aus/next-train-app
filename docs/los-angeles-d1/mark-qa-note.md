# Los Angeles flip QA note (Mark, re-QA 27 Oct 2026 ~07:00-07:15 PDT, after #535)

Supersedes the 24 Oct note (Metro-only pack). Flip PR #534, branch `flip/los-angeles` merged with master `7d0ff1d8`.

**Technical verdict: NO-GO.** One hard fail (Pacific Surfliner never shows a live row). Everything else is green.
**Separate from that:** the PR keeps `hold` for Tim's open Metrolink GTFS-RT EULA question (section 1/3: internal business purposes; no distribution without written consent). The ledger records Tim's 25 Oct reading (one server-side key, rider-facing boards, no raw protobuf republished), but the question is open with Tim.

## Hard fail: Pacific Surfliner live rows never reach Union Station

The transitdocs feed carries Surfliner (route 78) as the static numeric trip ids (307914, 307917, ...), and 27 route-78 entities were live, 34 entities call at LAX. Union Station's rider `/api/board` showed `Pacific Surfliner + San Diego` and `+ Goleta Amtrak` as `no-live-predictions` (and `+ San Luis Obispo` not-currently-served) while train 564 (San Diego, live prediction 07:10 PDT) was 6 minutes out.

Cause (evidence, not fixed here): Amtrak's static `stop_times.txt` is in Eastern wall-clock, the adapter parses it as America/Los_Angeles (`loadAmtrakSurflineStatic` uses `LOS_ANGELES_TIME_ZONE`). Train 562: static LAX departure `9:10:00`, feed time 06:10 PDT; 564: `10:10:00` vs 07:10; 566: `11:10` vs 08:10; 572: `14:10` vs 11:10; 580: `18:10` vs 15:10 (every sampled trip is exactly +3h). Rows therefore fall outside the board window, and the `scheduledDestinationsRemaining` empty-reason logic is shifted by 3h too. The dogfood gate passes because its Surfliner fixtures are synthetic and written in LA time. A walk-up service is silently absent from an in-catalog board, so this is a board-eligibility hard fail (hub-lock severity). Needs a fresh Jim call with a real-feed (not fixture) Surfliner gate that pins a live LAX departure.

## Checklist

| Check | Result |
|---|---|
| v1 mode cut (Metro Rail A/B/C/D/E/K + Metrolink at 2 stations + Surfliner at Union) | PASS (110 stations; coverage notes match) |
| Hub lock 7th St/Metro Ctr never a direction token; doNotGroup downtown | PASS (`/api/directions` for 7th St has no 7th token; no Metrolink/Surfliner there) |
| DST | PASS with the 24 Oct note (fall back 1 Nov, 01:00-03:00 emptyReason window can be an hour out) |
| Board eligibility: oracle sections present, no `undecided` (LA, Metrolink, Surfliner packs) | PASS |
| Board eligibility: filtering matches verdicts | FAIL for Surfliner (verdict `in`, never shown live); PASS for Metro Rail, Metrolink (Union + Pomona North only), long-distance Amtrak absent, G/J out |
| Ledger consistency | PASS (US ledger has no stop-ownership section; LA rows match adapter) with stale-wording flags below |
| Union Station combined board (Metro + Metrolink + Surfliner) | PARTIAL: Metro and Metrolink live (A, B, D; 91-PV, AV, OC, SB, VC), no bare/self chips, 23 chips; Surfliner empty (see fail) |
| Metrolink-served other catalog stations | PASS: only Union Station and Pomona North match the Metrolink stop list (Norwalk is a name overlap only, different station, not in pack scope) |
| Pomona North | PASS: A Line + Downtown Long Beach, SB Line + Redlands/San Bernardino/Union Station; no Surfliner |
| Live-only, board `realtime: true` | PASS at `fetchStationBoard` (Union, Pomona North, Wilshire/Western `realtime=true`); rider `/api/board` has no realtime field, checked via rows (every row carries a live prediction) |
| Honest empty state per group | PASS: Metrolink/Metro empties carry `no-live-predictions` / `not-currently-served`; Surfliner empty is mislabelled (a prediction exists) |
| Reachability (every row via a chip) | PASS: `/api/directions` lists every chip the board emits at Union, Pomona North, 7th St |
| All-stations live sweep (Swiftly) | PASS: 9 polls, 9 requests, 107 live x9, 3 documented not-currently-served (Wilshire La Brea/Fairfax/La Cienega, D Line until 1 Nov), 0 zero |
| Metrolink feed health | PASS: keyed feed 43 entities, 3 polls 200, ~15 s apart |
| Surfliner feed health | feed OK (654 entities, 27 route 78, 34 at LAX) but not consumed correctly, see fail |
| `node qa/run-all.mjs --smoke` | see PR description |

## Stale wording (flag only, not edited)
- `docs/united-states-ledger.md` lines ~13, 56, 83, 87: still say Amtrak real-time is unconfirmed / "no region may wire Amtrak real-time without Tim's approval" and Pacific Surfliner has "no confirmed public GTFS-RT feed"; contradicts the Option B rows at ~110-118 (Tim approved the transitdocs feed 25 Oct).
- `docs/los-angeles-d1/oracle-clash-report.md` Board eligibility correction note: "wiring [Surfliner] still waits on the US ledger's Amtrak feed and redistribution check" is stale; the Metrolink row says Union Station only (omits Pomona North).
- `docs/los-angeles-metrolink-d1/oracle-clash-report.md` "Skip risk": "wiring a live board is blocked until Tim accepts the GTFS-RT EULA" conflicts with the ledger line "live use approved the same day". Which is right is Tim's call (the licence question).
- `docs/los-angeles-d1/jim-handoff.md` line ~50: still says Metrolink/Surfliner "recorded out-product as PROPOSED".
- `docs/los-angeles-d1/oracle-clash-report.md` line ~109 "Modes v1: Metro Rail only ... no Metrolink / Amtrak".
- Rider coverage note for Metrolink says "Requires METROLINK_API_KEY" (env var name in rider copy).
- Ops: confirm `METROLINK_API_KEY` is set in the Vercel production env before any flip, otherwise Metrolink silently degrades to no-live-predictions.
