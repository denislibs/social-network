import type { ServiceIdentifier } from '@/shared/di'
import type { Counters, HandleDto, Page, ProfileDto, ProfilePatch, UserCellDto } from './types'

export interface UserGateway {
  getProfile(handle: string): Promise<ProfileDto>
  getFriends(userId: number, cursor: string | null): Promise<Page<UserCellDto>>
  getFollowers(userId: number, cursor: string | null): Promise<Page<UserCellDto>>
  getRequests(dir: 'incoming' | 'outgoing', cursor: string | null): Promise<Page<UserCellDto>>
  /**
   * Backed by `getProfile` under the hood: the backend has no standalone
   * `GET /users/:id/counters` route (`GetCounters` is an application query with
   * no HTTP route yet), and `ProfileDto` already carries `counters` — so this
   * reuses `GET /users/:id` rather than requiring a second endpoint.
   */
  getCounters(userId: number): Promise<Counters>
  searchUsers(q: string): Promise<UserCellDto[]>
  updateProfile(patch: ProfilePatch): Promise<ProfileDto>
  resolve(handle: string): Promise<HandleDto>
}

export const USER_GATEWAY: ServiceIdentifier<UserGateway> = Symbol('UserGateway')
