# Auckland direction model memo (§3 for Tim)

Context **today (24 Aug 2026)**: **hub-and-spoke**. Southern, Eastern and Western terminate at **Waitematā Station**. Onehunga terminates at **Newmarket**. Official pages/tabs talk “Towards Waitematā / Towards {suburb}” and “City Centre” as a precinct, not as a stop.

Context **from Sunday 13 September 2026**: CRL makes Waitematā a **through station**. Eastern+Western become **East West (E-W)** Swanson–Manukau via the tunnels. Southern becomes **South City (S-C)** with a **city loop** (Newmarket–Grafton–Karanga-a-Hape–Te Waihorotiu–Waitematā–Parnell–Newmarket). Onehunga becomes **Onehunga West (O-W)** to Maungawhau (peak) / Henderson (off-peak). AT already tells riders to read the destination on the front of the train because platforms and ends will vary.

Inbound/outbound vs CBD is already a bad *product* model at Newmarket (three lines) and becomes false the moment trains run through Waitematā.

## Recommendation

**Line + terminus** (example: `Southern Line + Pukekohe`, or `Eastern Line + Manukau`).

Use the **suburban** terminus on trains leaving the hub. Use **Waitematā Station** (not City Centre, not Britomart) on trains arriving at the hub. At Newmarket the useful pair is line + suburban end (Southern vs Western vs Onehunga).

Do not write D5 assertion tables until Tim locks this. After 13 Sep, keep the same model with new line tokens (East West + Swanson / East West + Manukau; South City + Pukekohe; Onehunga West + Henderson or Maungawhau).

## Options

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | Southern Line + Pukekohe; Eastern Line + Manukau | Matches map families; splits H4 at Newmarket/Penrose/Ōtāhuhu; survives CRL through-running and the South City loop | Must pick future shorts (Henderson vs Maungawhau). Pages say “City Centre” not “Waitematā Station” |
| **B. Terminus only** | Pukekohe; Swanson | Matches destination blinds | At Waitematā every train is a different suburb with no line family. After CRL, East West has two suburban ends |
| **C. Inbound/outbound vs CBD + terminus** | To City / To Pukekohe | Close to current “Towards Waitematā” tabs | False at Newmarket today (three directions). Collapses after CRL through-running. South City loop has no unique inbound |

## §3 examples (illustrative — not D5)

Assume model A. Locked stop string **Waitematā Station**. Current network.

### Waitematā Station (hub)

| train | label |
| --- | --- |
| STH | Southern Line + Pukekohe |
| EAST | Eastern Line + Manukau |
| WEST | Western Line + Swanson |

No Onehunga here.

### Newmarket (H4)

Southern Line + Pukekohe vs Western Line + Swanson vs Onehunga Line + Onehunga. Inbound/outbound does not work (Southern and Western both “to Waitematā”).

### Penrose

Southern Line + Pukekohe vs Onehunga Line + Onehunga.

### Ōtāhuhu

Southern Line + Pukekohe vs Eastern Line + Manukau.

### After 13 Sep 2026 (preview only — not D1)

East West Line + Swanson vs East West Line + Manukau at Waitematā / Te Waihorotiu / Karanga-a-Hape. South City Line + Pukekohe (and do not call the loop “inbound”). Onehunga West Line + Henderson vs + Maungawhau (H5).

## Open §3 questions for Tim

1. Spoken/printed line token: `Southern Line` (maps) vs `STH` (page code) vs future `South City` / `S-C`. Rec: map family + suburban terminus; plan a 13 Sep token swap.
2. Hub far-end string: `Waitematā Station` (lock) vs official tab `City Centre` vs GTFS `Waitemata Train Station`.
3. Whether Onehunga’s city-end stays `Newmarket` until CRL (yes for current D1).
4. Macron policy on blinds vs GTFS ASCII.
