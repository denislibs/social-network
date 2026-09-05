import type { UserDto } from '@/shared/api'
import { api, unwrap } from '@/shared/api'

export const authApi = {
  async login(input: { login: string; password: string }): Promise<UserDto> {
    return unwrap(await api.api.v1.auth.login.post(input), { silent401: true }).user
  },
  async register(input: {
    login: string
    password: string
    firstName: string
    lastName: string
  }): Promise<UserDto> {
    return unwrap(await api.api.v1.auth.register.post(input)).user
  },
}
