/** One CSV cell. Cells that start like a formula get a leading quote so spreadsheets don't run them. */
export function csvCell(v: unknown): string {
  let t = String(v ?? "");
  if (/^[=+\-@]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

/** A header row plus data rows, as CSV text with a trailing newline. */
export function toCsvText(head: string[], rows: unknown[][]): string {
  return [head.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n") + "\n";
}
