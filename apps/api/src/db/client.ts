import { drizzle } from 'drizzle-orm/bun-sql'
import * as schema from './schema'

export function createDb(url: string) {
  return drizzle({ connection: { url, max: 10 }, schema })
}

export type Db = ReturnType<typeof createDb>
