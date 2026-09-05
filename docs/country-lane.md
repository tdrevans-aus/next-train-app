# Country lane — one-time coherence pass per shared-feed country

**Status:** Adopted (Tim, 30 Aug 2026), alongside `docs/board-eligibility-rule.md`
**Why:** `docs/multi-region-coherence-problem.md` — the per-region pipeline assumed segregated
networks (true in AU/NZ/CA, false in SE, very false in UK). Cross-region facts were being
discovered by accident, recorded asymmetrically, and never propagated.
**Related:** `docs/uk-architecture.md` (the UK already half-invented this) ·
`docs/board-eligibility-audit-au-se-nl.md`

## When a country needs the lane

Run it when any of the following is true; otherwise skip it (Australia, New Zealand, Canada —
segregated networks, per-agency feeds — never need it):

1. The country has a **shared or national feed** serving more than one planned region (Darwin
   for GB, Trafiklab for Sweden, OVapi for NL, Entur-style national aggregators).
2. Any two planned regions **physically or operationally overlap** — shared stations, shared
   corridors, through-running services.
3. **The feed platform itself is genuinely national or multi-region, even if only one region is
   currently planned.** Planned-region-count is a proxy for risk, not the risk itself — Sweden's
   Trafiklab was already known-national before Malmö/Uppsala entered the pipeline, and the lane
   still wasn't run until they were mid-build, which is what caused the wave-1 rebuild (PR #157).
   Don't wait for a second region to be scheduled before checking whether the platform is shared;
   check the platform, not the tracker's wave assignment. Examples: Digitransit (Finland — also
   serves Tampere's Nysse via the same platform), Entur (Norway), Rejseplanen (Denmark).

Trigger 3 only requires a **light pass** — record the Provider decision section now (is this a
shared-provider-config architecture, à la UK/Darwin, that later regions should be built against)
so the first region's adapter doesn't need retrofitting later. Don't manufacture stop-ownership,
national-service verdicts, or coverage-boundary sections for a second region that isn't scoped
yet — that's real work for when it actually enters the pipeline, not busywork now.

## When it runs, and who

**Once per country, before that country's first region enters the pipeline.** For countries
already started (UK, SE, NL) it runs as a retrofit — before the *next* region enters the
pipeline there. It is a **Nico invocation with a country-scoped brief** (research-shaped work:
feeds, ticketing pages, network maps). Contested calls — which region owns a boundary stop,
whether a walk-up national service is shown — go to Tim; the lane records the decision, it
doesn't make it.

## Output — `docs/<country>-ledger.md`

One file, four sections. This file is the single cross-region truth for the country:

| Section | Contents |
|---|---|
| **Provider decision** | The shared feed(s), auth, licensing; whether regions are configs over one provider (UK/Darwin pattern) or per-region adapters remain justified |
| **Stop ownership** | Every shared/boundary station with exactly one home region (the `uk-architecture.md` "first home region wins" rule, generalized). Visible from every side by construction |
| **National-service verdicts** | Board-eligibility verdicts (`docs/board-eligibility-rule.md` vocabulary) for every cross-region/national service — the SJ/X2000/Öresundståg class. Silence invalid |
| **Coverage boundaries** | Where each feed's stop-level data actually ends (the Uppsala unbacked-corridor class), so no region scopes past its data again |

## The propagation rule

When a later region's onboarding discovers something that affects an earlier region (the
Uppsala → Stockholm line-40 case), the discovery goes **into the country ledger, never into the
earlier region's pack**. Earlier packs are immutable history; the ledger is current truth. Any
lane needing cross-region facts reads the ledger, not other cities' packs.

## How region lanes use it

- **Nico (region run):** read the country ledger before scoping; the region's Board-eligibility
  section cites ledger verdicts rather than re-deriving them. New cross-region findings → write
  to the ledger, flag in the report.
- **Luke:** ledger stop-ownership and coverage boundaries constrain `published-network.json` —
  a station owned by another region does not enter this region's catalog.
- **Jim:** in a shared-provider country, the region's "adapter" is a config (allow-list +
  direction model) over the shared provider — don't clone the provider per region.
- **Mark:** QA gate includes ledger consistency — every catalog station is owned by exactly one
  region; no ledger verdict contradicted by adapter filtering; no `undecided` rows.

## Standing retrofits (tracked on the Countries sheet, `Country lane` column)

- **UK** — required before the next NR region: formalize the one-Darwin-provider decision,
  fold the ad-hoc "Cross-Region Boundary" sections from the glasgow/edinburgh/east-midlands
  oracle reports into `docs/united-kingdom-ledger.md`, verdicts for Eurostar (`out-checkin`) and sleepers.
- **Sweden** — before Malmö/Uppsala flip: shared-Trafiklab provider decision, line-40
  stop-ownership (Uppsala C / Knivsta / Arlanda C), SJ / Öresundståg / Krösatågen verdicts.
- **Netherlands** — light: record the shared-OVapi provider and the forward-looking NS stance
  from the board-eligibility audit.
