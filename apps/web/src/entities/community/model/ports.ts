import type { ServiceIdentifier } from '@/shared/di'
import type {
  CommunityCellDto,
  CommunityDto,
  CreateCommunityInput,
  Membership,
  Page,
  UserCellDto,
} from './types'

export interface CommunityGateway {
  get(handle: string): Promise<CommunityDto>
  members(id: number, cursor: string | null): Promise<Page<UserCellDto>>
  mine(): Promise<CommunityCellDto[]>
  search(q: string): Promise<CommunityCellDto[]>
  create(input: CreateCommunityInput): Promise<CommunityDto>
  join(id: number): Promise<{ membership: Membership; isFollowing: boolean }>
  leave(id: number): Promise<{ membership: Membership; isFollowing: boolean }>
  follow(id: number): Promise<{ isFollowing: boolean }>
  unfollow(id: number): Promise<{ isFollowing: boolean }>
}

export const COMMUNITY_GATEWAY: ServiceIdentifier<CommunityGateway> = Symbol('CommunityGateway')
