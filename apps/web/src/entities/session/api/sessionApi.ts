import { type ApiClient, ApiError, type UnauthorizedBus, type UserDto, unwrap } from '@/shared/api'
import type { SessionGateway } from '../model/ports'

export class EdenSessionGateway implements SessionGateway {
  constructor(
    private readonly api: ApiClient,
    private readonly bus: UnauthorizedBus,
  ) {}
  async me(): Promise<UserDto | null> {
    try {
      return unwrap(await this.api.api.v1.me.get(), { silent401: true }).user
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null
      throw e
    }
  }
  async logout(): Promise<void> {
    unwrap(await this.api.api.v1.auth.logout.post(), { silent401: true })
  }
}
