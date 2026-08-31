# South Yorkshire direction model memo (§3)

Context **today (31 Aug 2026)**: two agencies, two different direction-model problems, sharing
one hub name (Sheffield Station), same overall shape as East Midlands' Nottingham Station memo
(`docs/east-midlands-d1/direction-model-memo.md`).

## Sheffield Supertram

Four lines, per the oracle report (line 39):

| line | termini | via |
| --- | --- | --- |
| Blue | Malin Bridge — Halfway | Sheffield city centre / Manor Top / Gleadless Townend / Crystal Peaks |
| Purple | Sheffield Station — Herdings Park | city centre / Manor Top; branches to Gleadless Townend |
| Yellow | Middlewood — Meadowhall | city centre / Kelham Island / Hillsborough / Sheffield Arena |
| Tram-Train | Sheffield — Rotherham Central — Parkgate | via Sheffield Arena and Meadowhall, switches to National Rail infrastructure post-Meadowhall South/Tinsley |

51 stops total (report line 3), but the report gives **line-level via-points and termini only —
no full intermediate stop-order list** for any of the four lines. This is a real gap, same shape
as East Midlands' NET gap; see hazard-pack.md and coverage notes in published-network.json.

### Recommendation — Supertram: line (colour) + terminus

**Line + terminus** (example: `Blue + Halfway`, `Purple + Herdings Park`, `Tram-Train +
Parkgate`). This matches the convention used in every reference pack (Rotterdam, Newcastle,
Boston, East Midlands NET) and is the only model that survives a four-line hub (Sheffield
Station is called by Purple and Tram-Train directly, and Blue/Yellow both pass through the city
centre corridor) without ambiguity. Do not use inbound/outbound or compass — Sheffield Station is
not the geographic centre of Blue or Yellow's run, and Tram-Train's own hub-adjacent terminus
(Sheffield) makes "inbound" ambiguous at the very station where riders would read it.

**Caveat — Purple's Gleadless Townend branch:** the report names a branch to Gleadless Townend on
the Purple line, and Blue also calls at Gleadless Townend en route Malin Bridge–Halfway (line 39).
Line+terminus does not by itself disambiguate "which direction past the branch point" for Purple
services running toward Gleadless Townend vs continuing to Herdings Park — the report does not
give the branch junction detail needed to resolve this. Flag for Jim to confirm against a real
GTFS/timetable feed (once one exists under SYFTL) before shipping a Purple branch label as a §3
string; do not guess a junction station name.

**Caveat — Tram-Train's post-Meadowhall segment:** Tram-Train switches to National Rail
infrastructure after Meadowhall South/Tinsley. The direction label (`Tram-Train + Parkgate` /
`Tram-Train + Sheffield`) should still apply on this segment since it remains a single Supertram
service/product even though the underlying rails change — this is an infrastructure fact for the
station graph (see hazard-pack H1/H4), not a direction-model fork. Do not invent a separate
direction label for the post-Meadowhall segment.

## National Rail (Darwin/OpenLDBWS) at Sheffield Station

Same situation as East Midlands: National Rail has **no printed route/line map** in the oracle
report — Darwin is a per-station real-time departure-board API, not a fixed-route product. Real
departure boards label services by **destination (headsign), calling pattern, and operator**
(EMR, Northern, TPE, CrossCountry all serve South Yorkshire stations per report line 30), not by
a line name.

### Recommendation — National Rail: destination + operator, not line + terminus

Once `DARWIN_LDB_TOKEN` exists and this slot is built, direction should be modelled as
**destination (as returned by Darwin) + operator**, matching how National Rail boards actually
present themselves — **not** forced into the line+terminus shape used for Supertram. Different
model, same hub, same reasoning as East Midlands (`docs/east-midlands-d1/direction-model-memo.md`,
National Rail section): expected because they're different products (fixed-route light rail vs a
real-time heavy-rail board), and doNotGroup already keeps their platforms separate.

**This is a recommendation only** — National Rail is blocked at the account level (hazard-pack
H2) and no destination strings can be verified against a live Darwin response until Tim's RDM
re-registration completes. Do not build National Rail direction logic against guessed destination
strings; confirm against a real Darwin payload first.

## Options considered (Supertram)

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line (colour) + terminus** (recommend) | Blue + Halfway | Matches reference-pack convention; disambiguates the four-line Sheffield Station hub | Purple's Gleadless Townend branch not fully resolvable without a junction-level stop list |
| **B. Terminus only** | Halfway; Parkgate | Shorter | At Sheffield Station, riders would see Purple and Tram-Train termini without a line token — ambiguous given both call the hub directly |
| **C. Inbound/outbound vs Sheffield Station** | To Sheffield Station / from Sheffield Station | Simple at the hub | False for Blue/Yellow (Sheffield Station is not on their route at all — see station table); also fails the "geographic middle" test used to reject this model in every reference pack |

## §3 examples (illustrative, Supertram only — National Rail cannot be illustrated without a
live Darwin payload)

Assume model A. Locked hub **Sheffield Station**.

### Sheffield Station (Purple + Tram-Train + National Rail, doNotGroup)

Supertram tram platforms: `Purple + Herdings Park` (and, pending branch confirmation,
`Purple + Gleadless Townend`); `Tram-Train + Parkgate`. National Rail platforms: out of this
illustration — destination + operator model, no verified strings yet.

### Meadowhall Interchange (Yellow terminus + Tram-Train through-running + National Rail)

`Yellow + Middlewood` (Meadowhall is Yellow's terminus per the report). `Tram-Train + Rotherham
Central` / `Tram-Train + Sheffield` for the through-running Tram-Train service. National Rail:
destination + operator model, not illustrated here — see hazard-pack H1/H6 for why Meadowhall is
a through-running point, not a second hub lock.

### Parkgate (Tram-Train terminus)

`Tram-Train + Sheffield`. No other Supertram line. No National Rail (report line 18: "not served
by National Rail").
