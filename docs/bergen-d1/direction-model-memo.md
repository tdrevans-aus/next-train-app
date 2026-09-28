# Bergen direction model memo (§3 for Tim)

Context (28 Sep 2026): two passenger lines, each with its **own** city-centre terminus, sharing a
short trunk in and out of the centre and one genuine mid-network crossing. Official Skyss folder
titles print **1 Byparken - Bergen lufthavn** and **2 Bergen sentrum - Fyllingsdalen terminal**
(see hazard-pack.md H6 for the asymmetry: line 1's own page footer names the specific station,
Byparken; line 2's own page footer uses the "Bergen sentrum" marketing string instead of naming
Kaigaten).

## Recommendation

**Line + terminus** (example: `1 + Byparken`, `1 + Bergen lufthavn Flesland`, `2 + Kaigaten`,
`2 + Fyllingsdalen terminal`) — the same convention already used for Oslo, Vienna, and every prior
pack. Locked hub-lock string is **Bergen busstasjon** (hazard-pack.md H6), used only as the stop
string, never synthesized as a direction chip — but unlike Oslo's Stortinget or Vienna's
Karlsplatz, **neither line terminates or originates a special case at Bergen busstasjon** — it's a
plain through-station on both lines, so no self-referential-hub flag is needed there (contrast
with Oslo's R21/Jernbanetorget case).

## Why not other models

| model | how it reads | pros | cons |
| --- | --- | --- | --- |
| **A. Line + terminus** (recommend) | `1 + Byparken`; `1 + Bergen lufthavn Flesland`; `2 + Kaigaten`; `2 + Fyllingsdalen terminal` | Matches the Skyss folder titles and the printed pictogram diagrams; both lines' true station-level termini are real destinations riders can walk to (unlike Oslo's Stortinget, no line here has a through-only hub) | None identified — Bergen's topology is simpler than Oslo's or Vienna's for this purpose, since neither line has an internal branch or short-turn (hazard-pack.md H5) |
| **B. Terminus only** | `Byparken`; `Kaigaten`; `Fyllingsdalen terminal` | Reads clean since each terminus name is already unique across both lines (no Vestli-style clash) | Loses the line number, which riders use on wayfinding signage (every platform and vehicle prints the line number prominently) — no strong reason to drop it here since B's only real advantage (disambiguating a repeated terminus name) doesn't apply |
| **C. Inbound/outbound vs City** | `To City` / `To Fyllingsdalen` | Familiar in English | "City" is not a printed Skyss term anywhere in the two PDFs or the linjekart; "Bergen sentrum" is the closest marketing string and it spans *both* lines' termini (Byparken and Kaigaten are ~150m apart, both inside "sentrum") — using "City" as if it named a single stop would be worse than useless at Bergen busstasjon, which both lines pass through in *both* directions relative to their own single terminus |

## Hub lock — Bergen busstasjon, not Byparken (correction from the oracle report)

The oracle report locked **Byparken**, on the reasoning that "both lines meet in city centre."
Primary-source re-verification this pass (hazard-pack.md H2/H4/H6) found that reasoning doesn't
hold: **Line 2 never calls at Byparken** — its own ordered station list runs Kaigaten →
Nonneseter → Bergen busstasjon → Fløen → ... Byparken does not appear on it, on either the PDF or
Wikipedia's independent transcription. Byparken and Kaigaten are confirmed-distinct Entur NSR
stop-places (NSR:StopPlace:30859 vs NSR:StopPlace:62130), each served by exactly one line.

**Bergen busstasjon is the station both lines actually share in the city centre** (one stop out
from each line's own terminus), so this pack locks it instead. This is a change to the oracle
report's C2/C3 guidance to Jim — flagged explicitly, not silently swapped, and backed by the full
ordered PDFs this pass fetched directly rather than the oracle report's summary prose.

Byparken and Kaigaten are **not** downgraded to nothing — they remain the correct, real direction-
chip termini for lines 1 and 2 respectively (`1 + Byparken`, `2 + Kaigaten`), exactly like every
other line-specific terminus in this pack. The only thing that changes is which single string is
the *hub* — the stop used as a shared reference point and never itself synthesized as a
destination — and that string is Bergen busstasjon.

## §3 examples (illustrative — not D5)

### Bergen busstasjon (hub lock; both lines, plain through-station on both)

| train | label |
| --- | --- |
| 1 towards Byparken | 1 + Byparken |
| 1 towards Bergen lufthavn Flesland | 1 + Bergen lufthavn Flesland |
| 2 towards Kaigaten | 2 + Kaigaten |
| 2 towards Fyllingsdalen terminal | 2 + Fyllingsdalen terminal |

No self-referential-hub case exists here (contrast Oslo's Vy R21 at Jernbanetorget) — Bergen
busstasjon is not itself a printed terminus for either line, so no destination string ever equals
the hub's own stop string.

### Nonneseter (both lines, plain through-station on both; also the Bybanen stop nearest Bergen Railway Station — out of scope, see Board eligibility)

Same four chips as Bergen busstasjon. Vy/Arna trains at Bergen stasjon are **out of this city** —
"towards Bergen stasjon" is never a valid Bybanen direction chip here because no Bybanen service
runs there; it is a different stop-place entirely (hazard-pack.md H1/H3).

### Kronstad (both lines; the mid-network physical interchange, hazard-pack.md H4)

Same four chips. This is the point where the two lines' separate approach routes physically
cross — a genuine interchange, unlike Bergen busstasjon/Nonneseter's shared-trunk role — but the
direction chips are identical in form; only the hub-lock *string* choice (H6) distinguishes
Bergen busstasjon's role from Kronstad's.

### Byparken (line 1's own terminus; line 2 does not call here)

| train | label |
| --- | --- |
| 1 towards Bergen lufthavn Flesland | 1 + Bergen lufthavn Flesland |

Only one direction exists at Byparken (it's a true terminus, not a through-station) — same shape
as Vienna's Karlsplatz-for-U2 case, not Oslo's through-tunnel case. `1 + Byparken` is never
synthesized as a chip here (self-referential — the train is arriving, not departing towards
itself); this mirrors Oslo's R21/Jernbanetorget flag even though Bergen has no cross-operator
service triggering it.

### Kaigaten (line 2's own terminus; line 1 does not call here)

| train | label |
| --- | --- |
| 2 towards Fyllingsdalen terminal | 2 + Fyllingsdalen terminal |

Same shape as Byparken above, mirrored for line 2.

## Open §3 questions for Tim

1. **Hub-lock override** (this memo's main correction): confirm Bergen busstasjon over the oracle
   report's Byparken pick, given Line 2 never calls at Byparken. If Tim prefers to keep Byparken as
   the lock string for continuity with the oracle report's C2/C3 note to Jim despite the topology
   mismatch, that's a one-line change to this section and to `published-network.json`'s
   `printedInnerCityNames.lock` — flagging the choice rather than deciding it silently either way.
2. **Sletten vs Sletten senter, Bergen lufthavn Flesland vs Bergen lufthavn** (hazard-pack.md H2):
   this pack locks the Skyss/PDF print (rider-facing, printed on the platform and timetable) over
   the NSR canonical form for the *published* name; confirm that's the right choice for D1 display
   strings versus using the NSR form (which is what Jim's live Entur queries will return in
   `destinationDisplay`/`quay` fields).
3. Spoken/printed line token: `1`/`2` vs `Bybanen 1`/`Linje 1`. Rec: **{1,2} + official Skyss
   terminus**, matching every prior pack's convention.
