Lisbon D1 + research pack. City stays **planned** until Jim wires testers **and** Mark's QA
checklist confirms schedule-only boards (no real-time) are an accepted product state. Perth /
Sydney / Brisbane / Adelaide / Auckland live-gates untouched. Brussels / Copenhagen / Rotterdam
stay whatever status their own packs left them at and are untouched by this pack. No generator,
no product edit. Jim owns D2–D6. Do not flip lisbon live from this pack. Do not invent
city=tml, city=mlisboa, city=metrolisboa, or city=portugal.

Drop later (Jim D2): `qa/fixtures/lisbon/published-network.json`. Research pack is
`docs/lisbon-d1/`: `oracle-clash-report.md`, `hazard-pack.md`, `direction-model-memo.md`,
`published-network.json`, `jim-handoff.md` (this file).

## Source

D1 = official Metropolitano de Lisboa **network diagram**
`https://www.metrolisboa.pt/wp-content/uploads/2026/08/DiagramaRedeAgosto2026.pdf` (PDF title
`Diagrama da Rede_site_download2026`, Illustrator 30.6, created/modified
2026-07-27T13:27:34+01:00). Index:
`https://www.metrolisboa.pt/en/travel/diagrams-and-maps/`. **Metro-only plate** — the CP/suburban
rail lines drawn on it are context overlay, not D1 stops. Stations hand-transcribed from a 300dpi
render (pdftotext is layout-scrambled on this plate and was not used). **Not generated from
GTFS.** Static GTFS (`googleTransit.zip`) empty-key 200 confirmed 2026-09-06 — do not use it to
build JSON.

## Network

Four lines: **Azul** Reboleira – Santa Apolónia (18 stops), **Amarela** Odivelas – Rato (13
stops), **Verde** Telheiras – Cais do Sodré (13 stops), **Vermelha** S. Sebastião – Aeroporto (12
stops). **56 line ticks. 50 unique open Metro stations after dedupe** (six stations are each
shared by exactly two lines). This corrects the oracle report's approximate "Total: 56 unique"
figure — the report itself flagged that number `(approximate; exact dedupe at D1)`, and the exact
hand-transcribed count is 50, not 56. No fifth/sixth line, no "Linha Circular" on this diagram
edition.

## Hub-lock decision

Oracle report offered a choice: **Marquês de Pombal** (Azul × Amarela) or **Alameda** (Verde ×
Vermelha). **Chosen: Marquês de Pombal** — more central (top of Avenida da Liberdade, historic
civic-centre position) and the diagram's own richest icon row (bus, customer-care, wheelchair,
bike, police — the only station with all five). Full reasoning and rejected-alternative
comparison in `direction-model-memo.md`. This is a reference-point lock for prose/UI only —
**not** a direction token; every direction chip is line + terminus (see below), so the hub choice
does not affect §3 assertion logic, only which station name gets used as "the" inner-city
landmark in copy.

## Direction model

Lisbon has no branch/loop ambiguity: each line is a single simple route between two printed
termini, no "via" variants, no short-turn codes. Recommendation is **line + far terminus**
(`Azul + Santa Apolónia`, `Amarela + Odivelas`, etc.) — see `direction-model-memo.md` for the
full per-line terminus table and the five open §3 questions for Tim.

## doNotGroup (full detail in hazard-pack.md)

1. Six interchange stations (Marquês de Pombal, Campo Grande, Saldanha, Baixa-Chiado,
   S. Sebastião, Alameda) — each shared by exactly two lines, no station shared by three or four.
2. **Roma ≠ Areeiro ≠ "Roma/Areeiro"** — the third is a CP interchange pedestrian-link node, not
   a Metro stop. Only Roma and Areeiro are in `stations[]`.
3. **Correction to the oracle report:** its board-eligibility table lists "Alcântara Terra
   (M Vermelha)" as an overlapping-service station. The official diagram shows Alcântara-Terra /
   Alcântara-Mar only on the CP-only corridor near Belém/Santos — **not on any Metro line, not on
   Vermelha's actual route** (S. Sebastião ↔ Aeroporto, nowhere near the river at Alcântara). Not
   inserted into `stations[]`. Flagging back to Nico/Jim for confirmation rather than silently
   guessing either way.
4. Metro vs CP urban rail (Cascais/Sintra/Sul/Azambuja), Carris tram, Transtejo ferry, Carris
   Metropolitana/TUL bus — all out of v1 per the oracle report, unchanged here.

## Real-time constraint

**No public GTFS-RT, no public next-train API.** EstadoServicoML is line-status only
(operational state per line), OAuth-gated; empty-key probe returned **403** (confirmed
2026-09-06). Per the oracle report, even a valid key would not unblock departures/arrivals data —
this API structurally does not carry next-train info. **Boards will be schedule-based only: no
live delays, no next-train countdown.** This is recorded as a hazard in `hazard-pack.md` and in
`published-network.json`'s `liveBoards` block. Status stays **planned** until Mark's QA checklist
explicitly confirms static-only boards are an acceptable production state — this is a material
product limitation for Tim to weigh in on, not a data gap Jim's adapter work can close.

## Timezone

Europe/Lisbon **has DST** (WET/UTC+0 standard, WEST/UTC+1 late Mar–late Oct). Do not copy
Perth/Brisbane/Adelaide no-DST assumptions.

## License

CC0 (public domain) per the oracle report, sourced from the Zenodo record for the static GTFS
feed. No attribution required, commercial use allowed. Not re-verified in this pack — see the
oracle report's License section for the full citation chain (Zenodo, Transitland, Mobility
Database).

## What I did not do

No generator, no assertion tables, no live city flip, no product edit, no Perth edit, no
EstadoServicoML call with a real key, no cross-city merge, no GTFS zip extraction to build
`stations[]`, no license re-speculation beyond the oracle report's existing CC0 finding.
