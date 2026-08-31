/**
 * South Yorkshire direction model — Sheffield Supertram only (National Rail has
 * no printed route map; it stays destination+operator once Darwin is
 * unblocked, per docs/south-yorkshire-d1/direction-model-memo.md — nothing to
 * synthesize here until a real Darwin payload exists).
 *
 * Supertram: line (colour) + terminus, same shape as every reference pack
 * (Rotterdam, Newcastle, East Midlands NET). Chips are only generated for
 * genuine termini of a line (and the hub, Sheffield Station) — never for an
 * intermediate/via-point stop, because the oracle report gives named
 * via-points without an ordered stop sequence (see hazard-pack.md H3/H4/H5).
 * In particular: Purple's Gleadless Townend branch junction point is not
 * given by the report, so no Purple + Gleadless Townend chip is generated —
 * see direction-model-memo.md caveat. Do not guess it.
 */

export const SUPERTRAM_HUB = "Sheffield Station";

/** Termini-only per line — see file header for why via-points don't get chips. */
export const SUPERTRAM_LINES = [
  {
    id: "blue",
    number: "Blue",
    name: "Supertram Blue Line",
    termini: ["Malin Bridge", "Halfway"],
  },
  {
    id: "purple",
    number: "Purple",
    name: "Supertram Purple Line",
    termini: [SUPERTRAM_HUB, "Herdings Park"],
  },
  {
    id: "yellow",
    number: "Yellow",
    name: "Supertram Yellow Line",
    termini: ["Middlewood", "Meadowhall"],
  },
  {
    id: "tram-train",
    number: "Tram-Train",
    name: "Supertram Tram-Train",
    termini: [SUPERTRAM_HUB, "Parkgate"],
  },
];

export function foldKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Marketing tokens that must never resolve as a real station. */
const FORBIDDEN_COLLAPSE_NAMES = new Set(
  [
    "sheffield",
    "shf",
    "sheffield tram station",
    "sheffield rail station",
    "sheffield interchange",
    "tram",
    "supertram",
    "city centre",
  ].map(foldKey)
);

export function isForbiddenCollapseName(name) {
  return FORBIDDEN_COLLAPSE_NAMES.has(foldKey(name));
}

/**
 * "Line + Terminus" labels reachable from a given Supertram stop, excluding
 * any label that would name the station itself (self-referential arrival).
 * Only emitted for stations that are a genuine terminus of a line, or the
 * hub — never for an unconfirmed via-point (see file header).
 * @param {string} stationName
 */
export function marketingLabelsForStation(stationName) {
  const needle = foldKey(stationName);
  const labels = [];
  for (const line of SUPERTRAM_LINES) {
    if (!line.termini.some((t) => foldKey(t) === needle)) {
      // Station isn't a terminus of this line — no chip (via-points are a
      // real gap; do not guess a direction for them).
      continue;
    }
    for (const terminus of line.termini) {
      if (foldKey(terminus) === needle) {
        continue; // never show the station as its own destination
      }
      labels.push(`${line.number} + ${terminus}`);
    }
  }
  return labels;
}

/**
 * Map a line number + confirmed terminus into the locked "Line + Terminus"
 * chip. Returns null for anything not in the confirmed termini set — never
 * fabricates an intermediate-stop chip.
 * @param {string} terminus
 * @param {string} lineNumber
 */
export function mapSupertramDestination(terminus, lineNumber) {
  const line = SUPERTRAM_LINES.find((l) => l.number === String(lineNumber));
  if (!line) {
    return null;
  }
  const hit = line.termini.find((t) => foldKey(t) === foldKey(terminus));
  if (!hit) {
    return null;
  }
  return `${line.number} + ${hit}`;
}
