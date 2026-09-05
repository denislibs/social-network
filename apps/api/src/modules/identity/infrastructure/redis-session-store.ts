import type Redis from 'ioredis'
import type { SessionStore } from '../application/ports'

const DAY = 86400

export class RedisSessionStore implements SessionStore {
  private ttl: number
  private touchBelow: number
  constructor(
    private redis: Redis,
    opts: { ttlSeconds?: number; touchBelowSeconds?: number } = {},
  ) {
    this.ttl = opts.ttlSeconds ?? 30 * DAY
    this.touchBelow = opts.touchBelowSeconds ?? 29 * DAY
  }
  private key(t: string) {
    return `sess:${t}`
  }
  private userKey(id: number) {
    return `user_sessions:${id}`
  }
  async create(userId: number, meta: { ua?: string }) {
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')
    await this.redis
      .multi()
      .set(
        this.key(token),
        JSON.stringify({ userId, createdAt: Date.now(), ua: meta.ua ?? null }),
        'EX',
        this.ttl,
      )
      .sadd(this.userKey(userId), token)
      .expire(this.userKey(userId), this.ttl)
      .exec()
    return token
  }
  async get(token: string) {
    const raw = await this.redis.get(this.key(token))
    if (!raw) return null
    return { userId: (JSON.parse(raw) as { userId: number }).userId }
  }
  async touch(token: string) {
    const ttl = await this.redis.ttl(this.key(token))
    if (ttl > 0 && ttl < this.touchBelow) await this.redis.expire(this.key(token), this.ttl)
  }
  async delete(token: string) {
    const s = await this.get(token)
    const m = this.redis.multi().del(this.key(token))
    if (s) m.srem(this.userKey(s.userId), token)
    await m.exec()
  }
  async deleteAllForUser(userId: number) {
    const tokens = await this.redis.smembers(this.userKey(userId))
    const m = this.redis.multi()
    for (const t of tokens) m.del(this.key(t))
    m.del(this.userKey(userId))
    await m.exec()
  }
}
