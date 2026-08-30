# Denmark country ledger

**Status:** Light pass only (trigger 3, `docs/country-lane.md`) — 30 Aug 2026, ahead of Copenhagen's
D1 pack. Only Copenhagen is currently planned; Aarhus is Later/unscoped. Stop-ownership,
national-service verdicts, and coverage-boundary sections are deferred until Aarhus is actively
scoped — recording them now would be guessing at a station catalog that doesn't exist yet.

## Provider decision

Rejseplanen is a genuine national platform, not a Copenhagen-specific feed: one GTFS feed
(Transitland `f-rejseplanen~dk~gtfs`) covers 25+ operators countrywide, and Aarhus Letbane is
already integrated into Rejseplanen's coverage alongside Copenhagen Metro. Real-time is available
via both the REST API 2.0 `departureBoard` endpoint and SIRI-ET via the Dataudveksleren NAP.

**Decision: build as a shared-provider config, not per-region adapters.** Copenhagen and any future
Danish region (Aarhus) should be configs (allow-list + direction model) over one shared Rejseplanen
provider — the UK/Darwin pattern, not Sweden's per-city-adapter pattern. This is the opposite call
from Finland's (Digitransit was found to justify per-region adapters due to diverging realtime
layers between HSL and Waltti/Tampere) — don't assume the two Nordic countries take the same shape.

## Skip-risk note (not a ledger section, but recorded here since it gated tonight's plan)

Copenhagen's original oracle note flagged "metro next-train may still be unavailable via public
API — confirm at D1," based on older Rejseplanen documentation that excluded Metro RT. API 2.0
documentation and working third-party integrations confirm Metro real-time is included. Downgraded
from a blocker to a "verify while building" item — Luke should confirm the exact endpoint behavior
while constructing the D1 pack, not treat this as settled without checking, but it is not a reason
to park Copenhagen.
