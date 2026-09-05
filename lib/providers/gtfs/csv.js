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
