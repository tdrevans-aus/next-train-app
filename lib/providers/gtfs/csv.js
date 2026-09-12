/**
 * Minimal GTFS CSV parser (handles quoted fields).
 */

export function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length === 0) {
    return rows;
  }

  const headers = parseCsvLine(lines[0]);
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }
    const values = parseCsvLine(line);
    const row = {};
    for (let col = 0; col < headers.length; col += 1) {
      row[headers[col]] = values[col] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Same output as parseCsv(text).filter(predicate), but never holds an
 * array of every parsed row at once - only rows that pass `predicate` are
 * kept. Added for lib/providers/gtfs's SEQ shared-feed trim
 * (docs/jim-brief-seq-refresh-oom.md): stop_times.txt for the whole SEQ
 * network (bus + rail + ferry) is far larger than the rail-only or G:link-
 * only subset either city actually needs, and materializing every row as a
 * JS object before filtering is what pushed a single trim call to ~2GB
 * heap in isolation (measured locally under --max-old-space-size=2048).
 * Splits on "\n" via indexOf rather than String.split so the full line
 * array is never held either - only the current line's slice is live at
 * a time.
 */
export function filterCsvRows(text, predicate) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  const firstNewline = normalized.indexOf("\n");
  const headerLine = firstNewline === -1 ? normalized : normalized.slice(0, firstNewline);
  const headers = parseCsvLine(headerLine);
  let pos = firstNewline === -1 ? normalized.length : firstNewline + 1;
  while (pos < normalized.length) {
    let nl = normalized.indexOf("\n", pos);
    if (nl === -1) nl = normalized.length;
    const line = normalized.slice(pos, nl);
    pos = nl + 1;
    if (!line.trim()) {
      continue;
    }
    const values = parseCsvLine(line);
    const row = {};
    for (let col = 0; col < headers.length; col += 1) {
      row[headers[col]] = values[col] ?? "";
    }
    if (predicate(row)) {
      rows.push(row);
    }
  }
  return rows;
}

export function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}
