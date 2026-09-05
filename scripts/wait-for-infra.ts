import { SQL } from 'bun'

const deadline = Date.now() + 60_000

async function tryOnce(): Promise<boolean> {
  try {
    const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://vk:vk@localhost:5432/vk')
    const [row] = await sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`
    await sql.close()
    if (!row) return false
    return await fetchRedisPing()
  } catch {
    return false
  }
}

async function fetchRedisPing(): Promise<boolean> {
  const { RedisClient } = await import('bun')
  const c = new RedisClient(process.env.REDIS_URL ?? 'redis://localhost:6379')
  const pong = await c.send('PING', [])
  c.close()
  return pong === 'PONG'
}

while (Date.now() < deadline) {
  if (await tryOnce()) {
    console.log('infra ready')
    process.exit(0)
  }
  await Bun.sleep(1000)
}
console.error('infra not ready after 60s')
process.exit(1)
