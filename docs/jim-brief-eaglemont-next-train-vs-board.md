# Jim brief — Melbourne: /api/next-train returns no train for "Eaglemont → Flinders Street (Hurstbridge Line)" while /api/board shows one (saved routes look empty)

**Lane:** bug-fix / product mode. **City:** melbourne (LIVE), country australia (acquire the lane lock). **Date:** 8 Oct 2026. **tim-review:** no.

## Evidence
- Mark (QA of #511, ~17:15 Melbourne): `qa/melbourne-dogfood-gate.mjs` fails "legacy hub-bound label request (Eaglemont towards Flinders Street) must return a non-null next train" with 2 live HBE trips on the board — identical on unmodified master. It is the #439 regression guard.
- Controller, production ~20:45 Melbourne after #511 deployed:
  - `/api/next-train?city=melbourne&station=Eaglemont&destination=Flinders%20Street` → label "Flinders Street", next=null, upcoming=0. Same for destination "Flinders Street (Hurstbridge Line)" and "Hurstbridge Line + Flinders Street".
  - `/api/board?city=melbourne&station=Eaglemont` → "Flinders Street (Hurstbridge Line)": next 21:37, upcoming 1; Eltham and Hurstbridge directions also populated.
  - Greensborough and Heidelberg next-train/boards show city-bound trains normally. Eaglemont stop_ids in the snapshot: 13756, 13757 (+ parent vic:rail:EAG, 26155), 1027/1021 stop_times rows.
- So the board and the saved-route endpoint disagree about the same direction at the same station. Riders with a pinned "Eaglemont → City" route see nothing.

## Investigate
Compare the two code paths for Eaglemont city-bound: label/alias resolution (legacy "Flinders Street" vs canonical "Flinders Street (Hurstbridge Line)", server-side aliases from #440), the direction match inside next-train vs board (City Loop vs direct trips? Hurstbridge trains running via the Loop are labelled differently?), the time horizon each uses (next-train may use a shorter window — evening headways are 20–40 min), and whether next-train calls the shared-station-board (#511) or a separate path. Find why next-train yields 0 when the board yields ≥ 1 for the same chip. Check every other Melbourne station on the Hurstbridge/Mernda group for the same mismatch (Clifton Hill, Ivanhoe, Darebin, Alphington, Fairfield, Dennis, Westgarth, Rosanna, Macleod, Watsonia, Montmorency) and sweep all Melbourne stations: for each direction chip, next-train non-empty iff board non-empty.

## Fix + gate
Make next-train and board agree (same horizon, same matching). Add a permanent gate case: for a set of Melbourne stations, every chip with ≥ 1 board trip must return a non-null next-train for both the canonical and legacy labels (fixture-backed, so it runs in CI). Keep the #439 legacy-alias guarantee.

## Acceptance
- Live (Melbourne evening/any service hour): Eaglemont next-train for all three label forms returns the same next train as the board; the all-stations parity sweep finds no mismatches; `node qa/melbourne-dogfood-gate.mjs` green; `node qa/run-all.mjs --smoke` PLAIN green.
- PR title: "Melbourne: saved-route endpoint agrees with the board (Eaglemont → Flinders Street was empty)".
- HARD RULES: never kill a process you did not start (port 3400 and PIDs 3424/42256/83872 off-limits); PORT + QA_BASE discipline; never loosen the 30 s maxDuration.
