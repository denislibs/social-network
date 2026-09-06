import type { Relation } from '@/entities/user'
import type { ServiceIdentifier } from '@/shared/di'

export interface FriendshipGateway {
  request(userId: number): Promise<Relation>
  accept(userId: number): Promise<Relation>
  decline(userId: number): Promise<Relation>
  remove(userId: number): Promise<Relation>
}

export const FRIENDSHIP_GATEWAY: ServiceIdentifier<FriendshipGateway> = Symbol('FriendshipGateway')
