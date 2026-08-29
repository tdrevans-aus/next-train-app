# Nico — research sources & license capture

**Audience:** Nico (research lane). Read this before scoping any city.
**Why it exists:** Aggregators already index most of the world's feeds — use them instead of
cold web searches. And FB-47 (curated network-model API, `docs/feature-backlog.md`) needs
per-feed license terms on file, so capture them now while you're already looking at the feed.

## 1. Primary research sources — check these first

Work in this order. Only fall back to general web search when both draw a blank or disagree.

1. **Transitland** — <https://www.transit.land/> (feed registry + REST API).
   The largest GTFS / GTFS-RT aggregator: feed URLs, auth requirements, fetch health, and
   operator metadata are already indexed per agency. A feed Transitland fetches successfully
   on a schedule is strong evidence the URL is real and stable — cite the Transitland feed
   page (Onestop ID) in your report.
2. **Mobility Database** (MobilityData) — <https://mobilitydatabase.org/>.
   Canonical catalog of GTFS/GTFS-RT feeds with source URLs, status, and license pointers.
   Good for cities Transitland covers thinly, and for spotting a feed's official landing page.

These replace guessing, not verification: still open the agency's own developer page to
confirm auth type and terms before writing the report. **Never invent a feed** — the existing
guardrail stands; if neither source nor the agency page verifies one, that's the skip risk.

## 2. Record license / redistribution terms in every oracle report

Add a **License** section to each `docs/<city>-d1/oracle-clash-report.md` with these fields:

- **License name** — e.g. CC BY 4.0, ODbL, agency-specific developer terms, "none stated".
- **Redistribution / rehosting** — may we serve this data to our own users via our API?
  May we pass it on to third parties? Quote or closely paraphrase the operative clause.
- **Commercial use** — allowed / prohibited / unclear.
- **Attribution** — required wording or logo, if any.
- **Terms URL** — link to the license or developer-terms page you read.
- **Confidence** — `clear` / `unclear` / `not found`. When unclear, say so plainly — do not
  interpret ambiguous terms optimistically. Unclear is a fine answer; a wrong "allowed" is not.

Keyed feeds (registration, tokens, HMAC): note whether the key agreement itself restricts
redistribution — for these the account terms usually govern, not the data license.

This is recording, not lawyering: capture what the terms say and where; Tim makes any
judgment calls downstream.
