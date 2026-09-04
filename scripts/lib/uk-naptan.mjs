/**
 * NaPTAN lookups for UK region catalog builders.
 * Rail: RailReferences.csv (CRS → ATCO) + access-nodes lat/lng.
 * Metro: ATCO stopId when set, else West Midlands Metro NaPTAN name join.
 */
const NAPTAN_CSV_URL = "https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv";
const RAIL_REF_URLS = [
  "https://beta-naptan.dft.gov.uk/api/v1/rail-references?dataFormat=csv",
  "https://gist.githubusercontent.com/crablab/93a50eeb338646614287eddc3c2776b1/raw/RailReferences.csv",
];

export function parseCsvRow(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function normalizeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRailName(commonName) {
  return normalizeKey(
    String(commonName ?? "")
      .replace(/\s+Rail Station$/i, "")
      .replace(/\s+Station$/i, ""),
  );
}

function normalizeMetroLabel(label) {
  return normalizeKey(
    String(label ?? "")
      .replace(/\s*\(West Midlands Metro\)\s*$/i, "")
      .replace(/\s+Metro\s*$/i, ""),
  );
}

export async function fetchRailReferencesCsv() {
  for (const url of RAIL_REF_URLS) {
    const response = await fetch(url);
    if (!response.ok) {
      continue;
    }
    const text = await response.text();
    if (text.includes("CrsCode") && text.includes("AtcoCode")) {
      return text;
    }
  }
  throw new Error("Could not fetch NaPTAN RailReferences.csv");
}

/**
 * @returns {Promise<{
 *   coordsForCrs: (crs: string, railName: string) => { lat: number, lng: number },
 *   coordsForMetro: (stop: { name: string, aliases?: string[], stopId?: string|null }) => { lat: number, lng: number },
 * }>}
 */
export async function loadUkNaptanIndex() {
  const [naptanCsv, railRefCsv] = await Promise.all([
    fetch(NAPTAN_CSV_URL).then((r) => {
      if (!r.ok) {
        throw new Error(`NaPTAN access-nodes fetch failed: ${r.status}`);
      }
      return r.text();
    }),
    fetchRailReferencesCsv(),
  ]);

  const atcoCoords = new Map();
  const rlyByName = new Map();
  const metroTmuByName = new Map();
  const metroLooseByName = new Map();

  for (const line of naptanCsv.split(/\r?\n/).slice(1)) {
    if (!line) {
      continue;
    }
    const cols = line.split(",");
    const atco = cols[0];
    const lng = Number(cols[29]);
    const lat = Number(cols[30]);
    const stopType = cols[31];
    const commonName = cols[4] ?? "";
    if (!atco || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    if (!atcoCoords.has(atco)) {
      atcoCoords.set(atco, { lat, lng });
    }
    if (stopType === "RLY") {
      const key = normalizeRailName(commonName);
      if (key && !rlyByName.has(key)) {
        rlyByName.set(key, { lat, lng });
      }
    }
    const isWmMetro =
      commonName.includes("West Midlands Metro") ||
      (commonName.includes(" Metro") && atco.startsWith("4300"));
    if (isWmMetro) {
      const label = normalizeMetroLabel(commonName);
      if (label) {
        metroLooseByName.set(label, { lat, lng });
        if (stopType === "TMU") {
          metroTmuByName.set(label, { lat, lng });
        }
      }
    }
  }

  const crsToCoords = new Map();
  for (const line of railRefCsv.split(/\r?\n/).slice(1)) {
    if (!line) {
      continue;
    }
    const cols = parseCsvRow(line);
    const atco = cols[0]?.replace(/^"|"$/g, "");
    const crs = cols[2]?.replace(/^"|"$/g, "");
    if (!atco || !crs) {
      continue;
    }
    const coords = atcoCoords.get(atco);
    if (coords) {
      crsToCoords.set(crs, coords);
    }
  }

  function coordsForCrs(crs, railName) {
    const fromRef = crsToCoords.get(crs);
    if (fromRef) {
      return fromRef;
    }
    const fromName = rlyByName.get(normalizeRailName(railName));
    if (fromName) {
      return fromName;
    }
    throw new Error(`No NaPTAN coords for CRS ${crs} (${railName})`);
  }

  function fuzzyMetroMatch(normCand) {
    const tmu = metroTmuByName.get(normCand);
    if (tmu) {
      return tmu;
    }
    const loose = metroLooseByName.get(normCand);
    if (loose) {
      return loose;
    }
    for (const [key, coords] of metroTmuByName) {
      if (key === normCand || key.startsWith(`${normCand} `)) {
        return coords;
      }
    }
    for (const [key, coords] of metroLooseByName) {
      if (key === normCand || key.startsWith(`${normCand} `)) {
        return coords;
      }
    }
    return null;
  }

  function coordsForMetro(stop) {
    const stopId = String(stop.stopId ?? "").trim();
    if (stopId && atcoCoords.has(stopId)) {
      return atcoCoords.get(stopId);
    }
    const candidates = [stop.name, ...(stop.aliases ?? [])];
    for (const candidate of candidates) {
      const key = normalizeMetroLabel(candidate);
      const hit = fuzzyMetroMatch(key);
      if (hit) {
        return hit;
      }
    }
    if (/wednesbury/i.test(stop.name) && /great western/i.test(stop.name)) {
      for (const [key, coords] of metroLooseByName) {
        if (key.includes("wednesbury") && (key.includes("gws") || key.includes("great western"))) {
          return coords;
        }
      }
    }
    throw new Error(`No NaPTAN coords for metro stop ${stop.name}`);
  }

  return { coordsForCrs, coordsForMetro };
}
