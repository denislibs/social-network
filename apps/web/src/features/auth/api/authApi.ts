import { type ApiClient, type UnauthorizedBus, type UserDto, unwrap } from '@/shared/api'
import type { AuthGateway } from '../model/ports'

export class EdenAuthGateway implements AuthGateway {
  constructor(
    private readonly api: ApiClient,
    private readonly bus: UnauthorizedBus,
  ) {}

  async login(input: { login: string; password: string }): Promise<UserDto> {
    return unwrap(await this.api.api.v1.auth.login.post(input), {
      silent401: true,
      bus: this.bus,
    }).user
  }

  async register(input: {
    login: string
    password: string
    firstName: string
    lastName: string
  }): Promise<UserDto> {
    return unwrap(await this.api.api.v1.auth.register.post(input), { bus: this.bus }).user
  }
}
