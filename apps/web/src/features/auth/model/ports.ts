import type { UserDto } from '@/shared/api'
import type { ServiceIdentifier } from '@/shared/di'

export interface AuthGateway {
  login(input: { login: string; password: string }): Promise<UserDto>
  register(input: {
    login: string
    password: string
    firstName: string
    lastName: string
  }): Promise<UserDto>
}

export const AUTH_GATEWAY: ServiceIdentifier<AuthGateway> = Symbol('AuthGateway')
