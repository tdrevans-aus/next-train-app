# Board eligibility — the walk-up rule

**Status:** Adopted (Tim, 30 Aug 2026) — part of the rule base for every region, current and future
**Owner:** Tim (product) · enforced in pipeline by Nico (verdicts) and Mark (QA gate)
**Related:** `docs/multi-region-coherence-problem.md` · `docs/multi-city-provider-design.md` ·
`docs/board-eligibility-audit-au-se-nl.md` (first audit) · `docs/uk-architecture.md`

---

## 1. The principle

> **Filter stations into the app; never filter trains off a board silently.**
>
> A station board must be complete for in-scope modes at that station. Duplication is visibly
> broken and gets caught; omission is invisibly broken and erodes trust with no error signal.
> Every service that calls at an in-catalog station is either shown, or excluded with a recorded
> verdict. Silence is a QA failure, not a default.

This exists because of the SJ finding (`docs/multi-region-coherence-problem.md`): Sweden's
adapters filter boards by *operator*, so SJ intercity trains calling at Uppsala C silently vanish
from a board a rider is looking at, and nothing distinguishes that from a deliberate cut.

## 2. The rule

The cutoff for what belongs on a board is **not** geography, distance, operator category, or
"intercity-ness" (Liverpool–Manchester crosses two regions and is a 25-minute commute;
Paris–London is one seat and is not). The cutoff is the **boarding contract**, tested per
service:

| # | Test | Fails when |
|---|------|-----------|
| 1 | **Walk-up boardable** — a rider on the platform with a standard ticket, pass, or contactless tap can board the next departure | Compulsory seat reservation (X2000, Snälltåget, Caledonian Sleeper, NSW TrainLink regional, Transwa) |
| 2 | **Leave-by valid** — nothing between station entrance and platform breaks door-to-platform math | Check-in cutoff, security, or border control (Eurostar) |

A service passing both tests at an in-catalog station **appears on that station's board**. A
service failing either is excluded — with the verdict recorded (§4).

Both tests are facts, not judgment calls: "compulsory reservation yes/no" and "check-in barrier
yes/no" come from the operator's ticketing page and are verifiable by Nico in research.

## 3. Verdict vocabulary

Every rail service calling at an in-catalog station gets exactly one verdict:

| Verdict | Meaning |
|---|---|
| `in` | Passes both tests; shown on boards |
| `out-reservation` | Fails test 1 (compulsory booking) |
| `out-checkin` | Fails test 2 (check-in / security / border) |
| `out-mode` | Excluded by the city's v1 mode cut (e.g. buses, ferries) — mode cuts stay legitimate |
| `out-product` | Passes both tests but excluded by an explicit product decision, with the reason and Tim's sign-off recorded (e.g. feed licensing, v1 scope). This is the honest label for what used to be silence — use sparingly and never as a shortcut |
| `undecided` | Recorded but awaiting Tim — must not survive to a live flip |

**Catalog cuts need no per-service verdict.** Which *stations* exist in the app is a product
choice (Amsterdam being GVB-metro-only is fine). Verdicts are only owed for services calling at
stations that *are* in the catalog. The moment a station enters a catalog, every service calling
there owes a verdict.

## 4. Where verdicts live

- **Per city (now):** the oracle-clash report gains a mandatory **Board eligibility** section —
  a table of every rail service calling at in-catalog stations, with verdict and evidence URL.
  Luke carries the verdicts into the D1 pack; Jim's adapter filtering must match them.
- **Per city (registry):** `out-product` and `out-reservation` cuts that shape the adapter get a
  one-line mention in the registry entry's `notes` (this already happens ad hoc — Öresundståg,
  Krösatågen; the rule makes it mandatory rather than stylistic).
- **Per country (when a country ledger exists per the multi-region-coherence work):** the ledger
  consolidates verdicts so cross-region services are recorded once, visible from every side.

## 5. Pipeline enforcement

- **Nico:** every oracle-clash report includes the Board eligibility section. An empty section
  requires the sentence "No services other than the in-scope operator call at any in-catalog
  station — verified", not silence.
- **Mark:** two new checklist items before any flip-PR: (1) the section exists and has no
  `undecided` rows; (2) the adapter's filtering matches the verdicts — a service marked `in`
  appears on a sampled board, a service marked `out-*` does not.
- **Existing live cities:** are not retroactively failed; they get verdicts via audits
  (`docs/board-eligibility-audit-au-se-nl.md` is the first). New flips gate on the rule from now
  on.

## 6. Edge cases, decided in advance

| Case | Ruling |
|---|---|
| Walk-up long-distance (LNER, Avanti, German ICE, SJ services *without* compulsory reservation) | `in`. If a 4-hour train on a metro board ever feels wrong, the refinement is a **display tier** (regional vs long-distance chip), not a different cutoff. |
| Optional reservations (bookable but not required) | `in` — test 1 asks whether reservation is *compulsory*. |
| Airport services with separate ticketing but walk-up boarding (Arlanda Express; HK Airport Express; Flytoget) | Pass the rule → `in` or `out-product` with a real recorded reason. **Never `out-mode`** — a train is not a mode cut just because it's a different product or premium fare. Station **access fees** (Arlanda C) don't change the verdict; note them in the pack. |
| **A different rail operator/network sharing an in-catalog station with the primary in-scope mode** (S-tog or DSB at a Metro station also serving Copenhagen; NSB/Vy at a T-bane station; SJ at a Sweden-network station) | This is **not** `out-mode`. `out-mode` is for genuinely different vehicle types (bus, ferry, tram) — a second rail network at the same physical, in-catalog station is a product decision, tested the same as anything else: pass both tests → `in` unless there's a real `out-product` reason (not "it's a different network" or "the city's v1 is scoped to one network" alone — those restate the exclusion, they don't justify it). This mistake has recurred three times in one pipeline pass (Öresundståg/Krösatågen, Vy/Flytoget, S-tog/DSB at Copenhagen) — treat "different network at a shared station" as a hard flag to re-test, not a default exclusion. |
| Sleepers | `out-reservation` in practice everywhere so far. |
| Rail-replacement buses | `out-mode`. |
| Same station hosting `in` and `out` services (St Pancras: Thameslink `in`, Eurostar `out-checkin`) | Expected and fine — verdicts are per service, not per station. |

## 7. Canonical help copy

The user-facing statement of this rule lives in the in-app Help dialog ("Which trains show up",
`public/index.html`). Canonical text, kept in sync here:

> **Every train you can walk up and catch.** If it stops at your station and you can board it
> with an ordinary ticket or travel card, it belongs on the board.
>
> We leave out trains you can't just hop on — ones that need a booked seat (long-distance and
> sleeper services in some countries) or airport-style check-in (like Eurostar). And we stick to
> the network your city page covers — train, metro or tram depending on the city, not buses.

## 8. Change log

| Date | Change |
|---|---|
| 2026-08-30 | Rule adopted from the multi-region coherence discussion. First audit: AU / SE / NL. |
| 2026-08-30 | Closed a recurring mislabeling: a second rail network at an in-catalog station was being marked `out-mode` (Flytoget at Oslo, S-tog/DSB at Copenhagen) instead of getting a real tested verdict. §6 now rules it out explicitly. |
