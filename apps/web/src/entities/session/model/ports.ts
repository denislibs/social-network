import type { UserDto } from '@/shared/api'
import type { ServiceIdentifier } from '@/shared/di'

export interface SessionGateway {
  me(): Promise<UserDto | null>
  logout(): Promise<void>
}

export const SESSION_GATEWAY: ServiceIdentifier<SessionGateway> = Symbol('SessionGateway')
