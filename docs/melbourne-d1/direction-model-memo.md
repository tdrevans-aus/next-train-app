# Melbourne direction model memo (§3 for Tim)

**Tim's decisions (20 Sep 2026, recorded in `docs/melbourne-d1/tim-decisions-2026-09-20.md`) close
all three open §3 questions below — see "Decided (20 Sep 2026)" at the end of this memo.**

Context (20 Sep 2026): Melbourne has three overlapping direction hazards no other AU city in
this pipeline has needed together — (1) **City Loop direction reversal by time of day and line
group**, (2) **direct vs via-Loop variants of the same line**, and (3) **Metro Tunnel
through-running** merging three previously separate lines (Sunbury, Cranbourne, Pakenham) into
one corridor with no shared hub-lock stop. Cross-city through-running of the Frankston/
Sandringham/Werribee/Williamstown kind is present but comparatively simple (each of those lines
already terminates at Flinders Street both ways — the complexity is the loop/direct choice, not
a second live terminus). This memo is the hard part of the Melbourne pack; several items below
need Tim's copy decision rather than a silent pick.

## 1. City Loop direction reversal, by line group and time of day

Twelve of the seventeen line groups (Frankston, Glen Waverley, Alamein, Belgrave, Lilydale,
Hurstbridge, Mernda, Craigieburn, Upfield, Werribee, Williamstown, Racecourse) can run **either**
via the underground City Loop (calling Flagstaff, Melbourne Central, Parliament in some order)
**or** direct (calling only Flinders Street / Southern Cross, skipping the three loop-only
stations), depending on time of day and which of the loop's shared portals that group is
rostered onto for that particular trip. In the real-world timetable this reverses across the
day: a line that enters the loop clockwise in the AM peak may run direct in the PM peak, or use
the opposite loop direction off-peak. Two trains signed for the same terminus can therefore
legitimately take different physical paths through the CBD at different times — the same failure
shape `direction-model-memo`s in other cities have flagged as "inbound/outbound is not a fixed
concept," but here it's not just inbound vs outbound, it's **loop vs direct on the same line**.

**Do not derive this from a static rule of thumb ("peak = loop", "off-peak = direct").** The
actual portal/direction assignment is a live timetable fact, not a fixed pattern this pack can
hard-code — get it from the realtime feed's own trip data (§3 below), never from a day-of-week/
time-of-day lookup table baked into the adapter.

## 2. Direct vs via-Loop — what a rider on the platform needs to see

A rider standing on a Frankston-line platform at, say, Malvern does not care whether their train
is "via the loop" in the abstract — they care whether it stops at Flinders Street sooner (direct)
or later (via loop, after Flagstaff/Melbourne Central/Parliament). For a rider standing at
**Flinders Street itself**, though, the distinction matters differently: a same-platform blind
that says "Frankston" doesn't tell them whether the next stop is Richmond (direct) or Southern
Cross (via loop) — and if their destination is Melbourne Central or Parliament, only a via-loop
train gets them there without changing.

**Recommendation: line + terminus, with a via-loop/direct qualifier surfaced only where it
changes the next stop or the destination reachability** — i.e. always compute it from the trip's
actual stop sequence (not a copy template), and only render it in the label when the rider is at
a stop where loop vs direct changes which stops come next (broadly: at or before Flinders Street
outbound from the CBD, or approaching Flinders Street inbound). Example: `Frankston Line + via
City Loop` vs `Frankston Line + direct`, shown only at Flinders Street, Southern Cross, and the
three loop stations; everywhere else on the Frankston line, `Frankston Line + Frankston` alone is
sufficient because both variants converge again south of Richmond/South Yarra.

**Flag for Tim:** whether "via City Loop" / "direct" should be a separate line of copy, a
parenthetical, or a chip/tag distinct from the line+terminus string — this is a UI/copy call, not
a data-modelling one, and the other AU cities packed so far (Sydney, Brisbane, Adelaide) have
never needed a second qualifier on the direction label. Decide before D5 assertion tables are
written for the loop-serving line groups.

## 3. Deriving loop vs direct from GTFS — no timetable fallback for live times

Per the "live-only boards, no scheduled times presented as live" rule already governing this
pipeline, the loop/direct distinction for a given real-time departure must come from the actual
GTFS-RT trip, using two signals in this order of preference:

1. **Stop sequence** — if the trip's `stop_time_update`/static `stop_times.txt` sequence for that
   `trip_id` includes Flagstaff, Melbourne Central, or Parliament between the relevant termini,
   it is via-loop; if it goes straight from Flinders Street (or Southern Cross) to the line's
   first suburban stop, it is direct. This is the authoritative signal because it is what
   actually happens, not what the operator intended to print.
2. **Headsign** — Metro Trains headsigns in practice do distinguish "via City Loop" in some
   cases, but this pack has not verified that the Open Data Portal's GTFS-RT `trip_update`
   payloads (or the paired static `trips.txt`) reliably carry that string for every affected
   line group — **unverified, flag for Jim's live-verification pass** (see jim-handoff.md). Do
   not build the primary logic on headsign text if stop-sequence derivation is available and
   correct; use headsign only as a fallback/cross-check once verified live.

**No timetable fallback**: if a trip's realtime stop sequence cannot be resolved (e.g. the
snapshot-freshness heuristic flags a low trip-id match rate), the adapter must not guess
loop-vs-direct from a static schedule assumption — it should fail the same way any other
unresolved live trip fails elsewhere in this codebase, not silently default to one variant.

## 4. Metro Tunnel through-running (Sunbury ↔ Cranbourne/Pakenham)

This corridor has **no hub-lock stop** — it explicitly bypasses Flinders Street, North
Melbourne, and the City Loop. The only shared "everyone passes through here" stops on this spine
are the five Metro Tunnel stations (Arden, Parkville, State Library, Town Hall, Anzac) plus
Caulfield/Dandenong, none of which are printed as *the* city hub the way Flinders Street is for
every other line group. **GTFS-corrected (20 Sep 2026, see gtfs-reconciliation.md):** the actual
physical join between Sunbury's own GTFS route and the Cranbourne/Pakenham routes is at **Town
Hall** — Sunbury's trips run only Sunbury↔Town Hall/State Library and never reach Anzac;
Cranbourne/Pakenham's trips run only Town Hall/Anzac↔their terminus and never reach
Arden/Parkville/State Library. A single Sunbury-to-Cranbourne (or -Pakenham) working is two
chained trip_ids under two different route_ids joined at Town Hall, not one route spanning the
whole corridor — Jim's adapter needs to stitch these via `block_id` (or equivalent) to present one
continuous journey to a rider, not surface a phantom "change at Town Hall."

**Recommendation: line + terminus, using the far printed terminus in each direction** —
`Sunbury Line + Sunbury` toward the west, `Sunbury Line + Cranbourne` / `Sunbury Line + Pakenham`
toward the south-east (mirroring how Washington's Silver Line prints two east-end termini). At
Dandenong, where the Cranbourne/Pakenham fork happens, the label must disambiguate the two
south-east termini the same way Stadium-Armory disambiguates Orange/Silver's two east ends in the
Washington pack — do not let a bare "Sunbury Line" swallow both branches once past Dandenong.

**Decided (20 Sep 2026):** no — see "Decided" section below. Riders never see "Metro Tunnel" as a
line name/brand; labels stay `Sunbury`/`Cranbourne`/`Pakenham` matching the official picker.

## 5. Cross-city through-running (Frankston/Werribee/Williamstown/Sandringham)

Simpler than the Metro Tunnel case: Frankston, Werribee, Williamstown, and Sandringham each
already terminate at Flinders Street on the CBD end (directly or via the loop) and at their
named outer terminus on the other end — a standard two-terminus line + terminus model applies
with no additional branch-disambiguation beyond what H4 in hazard-pack.md already lists
(Newport for Werribee/Williamstown). This is not a hazard beyond §1–§3 above; listed here only
so it's explicit that this memo has considered it and found nothing extra to flag.

## 6. What a rider on a platform actually needs to see — summary

| Rider location | What matters | Label |
| --- | --- | --- |
| Suburban stop on a loop-capable line, well away from the CBD | Terminus only; loop/direct converges again before reaching them | `{Line} Line + {terminus}` |
| Flinders Street / Southern Cross / a City Loop station | Whether this specific train is via-loop or direct, because it changes the next stop and (for loop stations) whether their destination is reachable at all without changing | `{Line} Line + {terminus}` plus a loop/direct qualifier (format TBD — flag above) |
| Sandringham line anywhere | No loop exists on this line at all | `Sandringham Line + Sandringham` / `+ Flinders Street` |
| Metro Tunnel spine (Sunbury/Cranbourne/Pakenham) anywhere | No hub-lock stop; must know which of the two south-east termini (or the west terminus) a train is headed to | `{Line} Line + {terminus}` — Sunbury / Cranbourne / Pakenham as far termini, disambiguated at Dandenong |
| Stony Point shuttle | Single shuttle, no direction ambiguity | `Stony Point Line + Stony Point` / `+ Frankston` |

## 7. Recommend

**Line + terminus** as the base model (matches every other AU/US city packed so far: Sydney,
Brisbane, Adelaide, Washington, Boston), with the City Loop's loop-vs-direct distinction layered
on top **only at the stops where it changes what the rider sees next**, derived live from GTFS
stop-sequence data with no timetable fallback. Tim's copy decision for the loop/direct qualifier
is now recorded ("Decided (20 Sep 2026)" below) — D5 assertion tables for the loop-serving line
groups can proceed on that format. Jim's live-verification pass (jim-handoff.md) should still
confirm whether headsign text is a usable cross-check for the stop-sequence signal (GTFS's static
`trips.txt` reliably carries "via City Loop" in the headsign for every loop-serving line group
sampled in this pass's reconciliation — see `gtfs-reconciliation.md` — but that is the static
schedule, not the realtime `trip_update` payload Jim will actually poll).

## Open §3 questions for Tim (historical — see "Decided" below)

1. **Loop/direct qualifier format** (§2): parenthetical, second line, or chip — not decided here.
2. **"Metro Tunnel" as a brand name** (§4): this memo recommends against inventing it as a
   fourth line name, but Tim should confirm against current on-platform signage once verifiable.
3. Whether Dandenong-fork disambiguation (Cranbourne vs Pakenham) needs a visual treatment beyond
   plain text, given it's the single highest-consequence direction-collapse risk in this pack (a
   wrong Cranbourne/Pakenham label sends a rider onto a ~20+ minute detour before they can
   correct course).
4. Whether testers see melbourne as its own city picker entry (yes — do not invent city=mel /
   ptv / vic; already settled by the oracle report, restated here for completeness).

## Decided (20 Sep 2026) — closes items 1–3 above

Recorded by the controller session from Tim's replies in chat
(`docs/melbourne-d1/tim-decisions-2026-09-20.md`). These are final for D5/build purposes; do not
re-open without a fresh Tim decision.

1. **Loop vs direct copy format (closes item 1).** Loop trains get a suffix on the direction
   label: **"via City Loop"**. Direct trains are **unlabelled** — no "direct" wording anywhere.
   Not a chip, not a parenthetical, not a second line: it's a plain suffix appended to the
   line+terminus string, e.g. `Frankston Line + Frankston via City Loop` vs plain
   `Frankston Line + Frankston`. The suffix is **derived live from the trip's own stop sequence**
   (§3's stop-sequence signal — never a time-of-day table, never a static/timetable fallback) and
   is shown **only** at the five stops where it changes what the rider sees next: **Flinders
   Street, Southern Cross, Flagstaff, Melbourne Central, Parliament**. Everywhere else on a
   loop-capable line, plain `{Line} Line + {terminus}` is sufficient (per §2/§6's existing
   reasoning — both variants converge again south of the loop-adjacent stations). No new
   chip/tag UI element is to be built for this.
2. **"Metro Tunnel" is not a rider-facing line name or qualifier (closes item 2).** Labels stay
   `Sunbury Line` / `Cranbourne Line` / `Pakenham Line` + terminus, matching the official line
   picker — do not invent a fourth "Metro Tunnel" brand, and do not surface "via Metro Tunnel" as
   a qualifier the way "via City Loop" is surfaced for the loop-serving groups. Rationale: every
   train on these three lines uses the tunnel, so unlike "via City Loop" (which distinguishes two
   real, different paths through the CBD), "via Metro Tunnel" would disambiguate nothing — it's
   true of 100% of trips on these lines, not a fork. (This is despite GTFS's own trip_headsign
   text literally containing "via Metro Tunnel" for some Cranbourne/Pakenham-to-Sunbury
   through-workings — see `gtfs-reconciliation.md` — that headsign text is a scheduling/ops
   artifact, not evidence riders should see it; do not build the rider-facing label from a
   literal headsign passthrough here.) Revisit only if a Melbourne tester reports confusion about
   trains that skip Flinders Street.
3. **Dandenong fork (Cranbourne vs Pakenham) — no special visual treatment (closes item 3).**
   Line + terminus already separates the two branches; no chip, colour, or icon beyond the plain
   text label. The one hard requirement: **the terminus must never be blank** for a train on the
   Sunbury/Cranbourne/Pakenham spine. A gate assertion must fail on a bare `Sunbury Line` /
   blank-terminus label for any trip on this spine — see `jim-handoff.md`'s build requirements
   and gate assertions for the exact check.

Item 4 (melbourne as its own city picker entry) was already settled by the oracle report and
needed no fresh decision.
