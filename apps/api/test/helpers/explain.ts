import type { Db } from '../../src/db/client'

type PlanNode = Record<string, unknown>

/** Flattens an `EXPLAIN (FORMAT JSON)` result into every plan node it contains, so a test can ask
 * "is there a Seq Scan on users?" or "which indexes were used?" without walking the tree itself. */
export function planNodes(node: unknown): PlanNode[] {
  if (Array.isArray(node)) return node.flatMap(planNodes)
  if (node && typeof node === 'object') {
    const rec = node as PlanNode
    const here = 'Node Type' in rec ? [rec] : []
    return [...here, ...Object.values(rec).flatMap(planNodes)]
  }
  return []
}

/**
 * `EXPLAIN (FORMAT JSON)` with `enable_seqscan = off`, on a dedicated connection so the setting
 * actually applies to the explained statement.
 *
 * Turning sequential scans off answers "*can* this query use an index?" rather than "does the
 * planner prefer one at this table size?" — on a few thousand rows a seq scan wins on cost
 * regardless of how the predicate is written, which would make the plan assertion prove nothing.
 * A query with no index path still comes back as a Seq Scan (merely penalised), so the assertion
 * still discriminates.
 */
export async function explainWithoutSeqScan(
  db: Db,
  text: string,
  params: unknown[],
): Promise<unknown> {
  return db.$client.begin(
    async (tx: { unsafe: (t: string, p?: unknown[]) => Promise<unknown> }) => {
      await tx.unsafe('set local enable_seqscan = off')
      return tx.unsafe(`EXPLAIN (FORMAT JSON) ${text}`, params)
    },
  )
}
