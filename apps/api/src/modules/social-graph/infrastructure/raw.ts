import type { Db } from '../../../db/client'

/**
 * Executes parameterised raw SQL through the underlying Bun SQL client (`db.$client`), bypassing
 * the Drizzle query builder. Reserved for statements the query builder cannot express cleanly
 * (the PYMK candidate query and the trigram community search) — everything else in this module
 * goes through Drizzle.
 */
export async function rawQuery<T>(db: Db, text: string, params: unknown[]): Promise<T[]> {
  return (await db.$client.unsafe<T[]>(text, params)) as unknown as T[]
}
