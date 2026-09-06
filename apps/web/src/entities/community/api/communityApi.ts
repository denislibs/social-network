import { type ApiClient, type UnauthorizedBus, unwrap } from '@/shared/api'
import type { CommunityGateway } from '../model/ports'
import type {
  CommunityCellDto,
  CommunityDto,
  CreateCommunityInput,
  Membership,
  Page,
  UserCellDto,
} from '../model/types'

export class EdenCommunityGateway implements CommunityGateway {
  constructor(
    private readonly api: ApiClient,
    private readonly bus: UnauthorizedBus,
  ) {}

  async get(handle: string): Promise<CommunityDto> {
    return unwrap(await this.api.api.v1.communities({ id: handle }).get(), { bus: this.bus })
      .community
  }

  async members(id: number, cursor: string | null): Promise<Page<UserCellDto>> {
    return unwrap(
      await this.api.api.v1.communities({ id }).members.get({ query: cursor ? { cursor } : {} }),
      { bus: this.bus },
    )
  }

  async mine(): Promise<CommunityCellDto[]> {
    return unwrap(await this.api.api.v1.me.communities.get(), { bus: this.bus }).items
  }

  async search(q: string): Promise<CommunityCellDto[]> {
    return unwrap(await this.api.api.v1.search.get({ query: { q, kind: 'communities' } }), {
      bus: this.bus,
    }).communities
  }

  async create(input: CreateCommunityInput): Promise<CommunityDto> {
    return unwrap(await this.api.api.v1.communities.post(input), { bus: this.bus }).community
  }

  async join(id: number): Promise<{ membership: Membership; isFollowing: boolean }> {
    return unwrap(await this.api.api.v1.communities({ id }).join.post(), { bus: this.bus })
  }

  async leave(id: number): Promise<{ membership: Membership; isFollowing: boolean }> {
    return unwrap(await this.api.api.v1.communities({ id }).join.delete(), { bus: this.bus })
  }

  async follow(id: number): Promise<{ isFollowing: boolean }> {
    return unwrap(await this.api.api.v1.communities({ id }).follow.post(), { bus: this.bus })
  }

  async unfollow(id: number): Promise<{ isFollowing: boolean }> {
    return unwrap(await this.api.api.v1.communities({ id }).follow.delete(), { bus: this.bus })
  }
}
