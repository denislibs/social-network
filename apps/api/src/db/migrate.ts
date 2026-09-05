import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/bun-sql/migrator'
import { createDb } from './client'

export async function runMigrations(url: string): Promise<void> {
  const db = createDb(url)
  await migrate(db, {
    migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '../../drizzle'),
  })
  await db.$client.close()
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL required')
  await runMigrations(url)
  console.log('migrations applied')
}
