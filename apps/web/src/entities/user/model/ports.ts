import type { ServiceIdentifier } from '@/shared/di'
import type { Counters, HandleDto, Page, ProfileDto, ProfilePatch, UserCellDto } from './types'

export interface UserGateway {
  getProfile(handle: string): Promise<ProfileDto>
  getFriends(userId: number, cursor: string | null): Promise<Page<UserCellDto>>
  getFollowers(userId: number, cursor: string | null): Promise<Page<UserCellDto>>
  getRequests(dir: 'incoming' | 'outgoing', cursor: string | null): Promise<Page<UserCellDto>>
  /**
   * Hits `GET /me/counters` for the signed-in user's own counters. Another user's counters
   * come from `getProfile(handle).counters` instead — there is no `GET /users/:id/counters`
   * route, only the `/me` one backed by the `GetCounters` application query.
   */
  getMyCounters(): Promise<Counters>
  searchUsers(q: string): Promise<UserCellDto[]>
  updateProfile(patch: ProfilePatch): Promise<ProfileDto>
  resolve(handle: string): Promise<HandleDto>
}

export const USER_GATEWAY: ServiceIdentifier<UserGateway> = Symbol('UserGateway')
