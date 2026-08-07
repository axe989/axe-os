// Minimal, dependency-free CSV writer. RFC 4180 quoting: a field is
// quoted whenever it contains a comma, a quote, or a newline; embedded
// quotes are doubled.

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function stringifyCsv(headers: string[], rows: Array<Record<string, string>>): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const rowLines = rows.map((row) => headers.map((header) => escapeCsvField(row[header] ?? "")).join(","));
  return [headerLine, ...rowLines].join("\r\n") + "\r\n";
}
