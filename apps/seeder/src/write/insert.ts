import type { SQL } from 'bun'

/**
 * Postgres caps a statement at 65535 bind parameters. A chunk of `n` rows with `columns`
 * columns sends `n * columns` parameters, so we keep `n * columns <= 60_000` — the margin
 * leaves room for the handful of extra binds a caller might add around the helper.
 */
export function chunkSize(columns: number): number {
  return Math.max(1, Math.floor(60_000 / columns))
}

/**
 * Bulk INSERT via Bun's `sql(rows)` helper, which expands an array of objects into
 * `(cols) VALUES (...), (...)`. Column names come from the FIRST row of each chunk, so every
 * row must carry the same key set — callers build rows from a fixed object literal.
 */
export async function insertChunked(
  sql: SQL,
  table: string,
  rows: Record<string, unknown>[],
  log?: (s: string) => void,
): Promise<void> {
  if (rows.length === 0) return
  const cols = Object.keys(rows[0]!).length
  const size = chunkSize(cols)
  for (let i = 0; i < rows.length; i += size) {
    const part = rows.slice(i, i + size)
    await sql`INSERT INTO ${sql(table)} ${sql(part)}`
    if (log && (i / size) % 20 === 0)
      log(`${table}: ${Math.min(i + size, rows.length)}/${rows.length}`)
  }
}
