import { type ApiClient, type UnauthorizedBus, unwrap } from '@/shared/api'
import type { UserGateway } from '../model/ports'
import type {
  Counters,
  HandleDto,
  Page,
  ProfileDto,
  ProfilePatch,
  UserCellDto,
} from '../model/types'

export class EdenUserGateway implements UserGateway {
  constructor(
    private readonly api: ApiClient,
    private readonly bus: UnauthorizedBus,
  ) {}

  async getProfile(handle: string): Promise<ProfileDto> {
    return unwrap(await this.api.api.v1.users({ id: handle }).get(), { bus: this.bus }).user
  }

  async getFriends(userId: number, cursor: string | null): Promise<Page<UserCellDto>> {
    return unwrap(
      await this.api.api.v1.users({ id: userId }).friends.get({ query: cursor ? { cursor } : {} }),
      { bus: this.bus },
    )
  }

  async getFollowers(userId: number, cursor: string | null): Promise<Page<UserCellDto>> {
    return unwrap(
      await this.api.api.v1
        .users({ id: userId })
        .followers.get({ query: cursor ? { cursor } : {} }),
      { bus: this.bus },
    )
  }

  async getRequests(
    dir: 'incoming' | 'outgoing',
    cursor: string | null,
  ): Promise<Page<UserCellDto>> {
    return unwrap(
      await this.api.api.v1.me.friends.requests.get({
        query: cursor ? { dir, cursor } : { dir },
      }),
      { bus: this.bus },
    )
  }

  async getCounters(userId: number): Promise<Counters> {
    return (await this.getProfile(String(userId))).counters
  }

  async searchUsers(q: string): Promise<UserCellDto[]> {
    return unwrap(await this.api.api.v1.search.get({ query: { q, kind: 'users' } }), {
      bus: this.bus,
    }).users
  }

  async updateProfile(patch: ProfilePatch): Promise<ProfileDto> {
    return unwrap(await this.api.api.v1.me.profile.patch(patch), { bus: this.bus }).user
  }

  async resolve(handle: string): Promise<HandleDto> {
    return unwrap(await this.api.api.v1.handles({ handle }).get(), { bus: this.bus })
  }
}
