import type Redis from 'ioredis'
import type { SuggestionDto } from '../application/dto'
import type { SuggestionCache } from '../application/ports'

export class RedisSuggestionCache implements SuggestionCache {
  constructor(private redis: Redis) {}
  private key(userId: number): string {
    return `pymk:${userId}`
  }

  async get(userId: number): Promise<SuggestionDto[] | null> {
    const raw = await this.redis.get(this.key(userId))
    return raw === null ? null : (JSON.parse(raw) as SuggestionDto[])
  }
  async set(userId: number, items: SuggestionDto[], ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(userId), JSON.stringify(items), 'EX', ttlSeconds)
  }
  async invalidate(userIds: number[]): Promise<void> {
    if (userIds.length === 0) return
    await this.redis.del(...userIds.map((id) => this.key(id)))
  }
}
