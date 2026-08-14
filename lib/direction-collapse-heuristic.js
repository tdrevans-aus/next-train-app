/**
 * Universal heuristic for collapsing short-turn terminals into line directions.
 * City-agnostic ruleset — Perth is the first consumer (Whitfords/Yanchep class).
 *
 * @see docs/direction-collapse-heuristic.md
 * @see lib/cities/perth/line-map.json
 */

/**
 * Decide whether candidate terminals should collapse under a canonical line terminus.
 *
 * @param {{
 *   terminals: string[],
 *   lineStationsOrdered?: string[],
 *   coOccurrenceByStation?: Record<string, string[]>,
 *   branchedJunctions?: string[],
 * }} input
 * @returns {{
 *   groups: Record<string, string[]>,
 *   rejected: Array<{ a: string, b: string, reason: string }>,
 *   rulesFired: string[],
 * }}
 */
export function proposeDirectionGroups(input) {
  const terminals = uniqueNormalized(input.terminals ?? []);
  const ordered = (input.lineStationsOrdered ?? []).map(normalizeKey);
  const branched = new Set((input.branchedJunctions ?? []).map(normalizeKey));
  const coOccurrence = input.coOccurrenceByStation ?? {};
  const groups = {};
  const rejected = [];
  const rulesFired = [];

  if (terminals.length < 2) {
    return { groups, rejected, rulesFired };
  }

  // Rule R1: Same corridor, nested short-turns — farther terminus is canonical.
  // If A appears strictly between B and the opposite end on an ordered line, A is a short-turn of B.
  if (ordered.length >= 3) {
    const terminalIndexes = terminals
      .map((t) => ({ t, i: ordered.indexOf(normalizeKey(t)) }))
      .filter((row) => row.i >= 0)
      .sort((a, b) => a.i - b.i);

    if (terminalIndexes.length >= 2) {
      const farthest = terminalIndexes[terminalIndexes.length - 1].t;
      const members = terminalIndexes.map((row) => displayName(row.t, input.terminals));
      groups[displayName(farthest, input.terminals)] = uniquePreserve(members);
      rulesFired.push("R1_nested_short_turns");
    }
  }

  // Rule R2: High co-occurrence at many intermediate stations → same line group.
  // If two termini co-list at ≥3 non-junction stations, propose merge under the more frequent outer.
  const pairScores = new Map();
  for (const [station, dirs] of Object.entries(coOccurrence)) {
    if (branched.has(normalizeKey(station))) {
      continue;
    }
    const present = uniqueNormalized(dirs).filter((d) => terminals.includes(d));
    for (let i = 0; i < present.length; i += 1) {
      for (let j = i + 1; j < present.length; j += 1) {
        const key = [present[i], present[j]].sort().join("|");
        pairScores.set(key, (pairScores.get(key) ?? 0) + 1);
      }
    }
  }

  for (const [pair, score] of pairScores) {
    if (score < 3) {
      continue;
    }
    const [a, b] = pair.split("|");
    if (branched.has(normalizeKey(a)) || branched.has(normalizeKey(b))) {
      rejected.push({
        a: displayName(a, input.terminals),
        b: displayName(b, input.terminals),
        reason: "R3_branched_junction_guard",
      });
      rulesFired.push("R3_branched_junction_guard");
      continue;
    }
    // Prefer existing R1 canonical if either already grouped.
    const existingCanonical = Object.keys(groups).find((canon) =>
      groups[canon].some((m) => normalizeKey(m) === a || normalizeKey(m) === b)
    );
    const canonical = existingCanonical ?? displayName(b, input.terminals);
    const members = uniquePreserve([
      ...(groups[canonical] ?? [displayName(canonical, input.terminals)]),
      displayName(a, input.terminals),
      displayName(b, input.terminals),
    ]);
    groups[canonical] = members;
    rulesFired.push("R2_cooccurrence_merge");
  }

  // Rule R4: Never merge terminals that only co-occur at known branch junctions.
  for (const station of branched) {
    const dirs = uniqueNormalized(coOccurrence[station] ?? []);
    for (let i = 0; i < dirs.length; i += 1) {
      for (let j = i + 1; j < dirs.length; j += 1) {
        const a = dirs[i];
        const b = dirs[j];
        const alreadyGrouped = Object.values(groups).some(
          (members) =>
            members.some((m) => normalizeKey(m) === a) &&
            members.some((m) => normalizeKey(m) === b)
        );
        if (alreadyGrouped) {
          // Undo unsafe merge
          for (const [canon, members] of Object.entries(groups)) {
            if (
              members.some((m) => normalizeKey(m) === a) &&
              members.some((m) => normalizeKey(m) === b)
            ) {
              delete groups[canon];
              rejected.push({
                a: displayName(a, input.terminals),
                b: displayName(b, input.terminals),
                reason: `R4_only_at_branch_junction:${station}`,
              });
              rulesFired.push("R4_only_at_branch_junction");
            }
          }
        }
      }
    }
  }

  return { groups, rejected, rulesFired: [...new Set(rulesFired)] };
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+stn$/i, "")
    .replace(/\s+station$/i, "");
}

function uniqueNormalized(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out;
}

function uniquePreserve(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(value);
  }
  return out;
}

function displayName(normalized, originals) {
  const found = originals.find((value) => normalizeKey(value) === normalizeKey(normalized));
  return found ?? normalized.replace(/\b\w/g, (c) => c.toUpperCase());
}
