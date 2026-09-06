import type { Relation } from '@/entities/user'
import { type ApiClient, type UnauthorizedBus, unwrap } from '@/shared/api'
import type { FriendshipGateway } from '../model/ports'

export class EdenFriendshipGateway implements FriendshipGateway {
  constructor(
    private readonly api: ApiClient,
    private readonly bus: UnauthorizedBus,
  ) {}

  async request(userId: number): Promise<Relation> {
    return unwrap(await this.api.api.v1.friends({ id: userId }).request.post(), {
      bus: this.bus,
    }).relation
  }

  async accept(userId: number): Promise<Relation> {
    return unwrap(await this.api.api.v1.friends({ id: userId }).accept.post(), {
      bus: this.bus,
    }).relation
  }

  async decline(userId: number): Promise<Relation> {
    return unwrap(await this.api.api.v1.friends({ id: userId }).decline.post(), {
      bus: this.bus,
    }).relation
  }

  async remove(userId: number): Promise<Relation> {
    return unwrap(await this.api.api.v1.friends({ id: userId }).delete(), { bus: this.bus })
      .relation
  }
}
