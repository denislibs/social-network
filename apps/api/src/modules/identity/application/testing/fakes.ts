import type { Counters, Relation, SocialReadPort } from '../../../../kernel/social-read'
import type { User } from '../../domain/user'
import { type ProfileDto, toUserDto, type UserCellDto } from '../dto'
import type { PasswordHasher, SessionStore, UserReadModel, UserRepository } from '../ports'

export class FakeHasher implements PasswordHasher {
  async hash(pw: string) {
    return `hashed:${pw}`
  }
  async verify(pw: string, hash: string) {
    return hash === `hashed:${pw}`
  }
}
export class InMemoryUsers implements UserRepository {
  private rows = new Map<number, User>()
  private seq = 0
  async findByLogin(login: string) {
    return [...this.rows.values()].find((u) => u.login.value === login) ?? null
  }
  async findById(id: number) {
    return this.rows.get(id) ?? null
  }
  async findByScreenName(screenName: string) {
    return [...this.rows.values()].find((u) => u.screenName === screenName) ?? null
  }
  async save(user: User) {
    if (user.id === null) user.assignId(++this.seq)
    this.rows.set(user.id!, user)
    return user
  }
  list(): User[] {
    return [...this.rows.values()]
  }
}
/** Read side over the same InMemoryUsers map, so a write is immediately visible to a query. */
export class InMemoryUserReadModel implements UserReadModel {
  constructor(private users: InMemoryUsers) {}
  async getMe(userId: number) {
    const u = await this.users.findById(userId)
    return u ? toUserDto(u) : null
  }
  async getProfile(idOrScreen: string): Promise<Omit<ProfileDto, 'counters' | 'relation'> | null> {
    const m = /^id(\d+)$/.exec(idOrScreen)
    const u = m
      ? await this.users.findById(Number(m[1]))
      : await this.users.findByScreenName(idOrScreen.toLowerCase())
    if (!u) return null
    return {
      ...toUserDto(u),
      status: u.status,
      bio: u.bio,
      city: u.city,
      birthday: u.birthday,
      isVerified: u.isVerified,
    }
  }
  async searchUsers(q: string, limit: number): Promise<UserCellDto[]> {
    const needle = q.toLowerCase()
    return this.users
      .list()
      .filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().startsWith(needle) ||
          (u.screenName ?? '').toLowerCase().startsWith(needle),
      )
      .slice(0, limit)
      .map((u) => ({
        id: u.id!,
        firstName: u.firstName,
        lastName: u.lastName,
        screenName: u.screenName,
        city: u.city,
        isVerified: u.isVerified,
        lastSeenAt: null,
      }))
  }
}
/** `relation`/`counters` fake for identity tests: no friendship graph, so relation only knows self. */
export class FakeSocialRead implements SocialReadPort {
  async relation(me: number | null, other: number): Promise<Relation> {
    return me === other ? 'self' : 'none'
  }
  async counters(): Promise<Counters> {
    return { friends: 0, followers: 0, communities: 0, incomingRequests: 0 }
  }
}
export class InMemorySessions implements SessionStore {
  tokens = new Map<string, { userId: number; touched: number }>()
  private n = 0
  async create(userId: number) {
    const t = `tok${++this.n}`
    this.tokens.set(t, { userId, touched: 0 })
    return t
  }
  async get(token: string) {
    const s = this.tokens.get(token)
    return s ? { userId: s.userId } : null
  }
  async touch(token: string) {
    const s = this.tokens.get(token)
    if (s) s.touched++
  }
  async delete(token: string) {
    this.tokens.delete(token)
  }
  async deleteAllForUser(userId: number) {
    for (const [t, s] of this.tokens) if (s.userId === userId) this.tokens.delete(t)
  }
}
