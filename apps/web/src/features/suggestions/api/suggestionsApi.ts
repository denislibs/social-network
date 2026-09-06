import type { SuggestionDto } from '@/entities/user'
import { type ApiClient, type UnauthorizedBus, unwrap } from '@/shared/api'
import type { SuggestionsGateway } from '../model/ports'

export class EdenSuggestionsGateway implements SuggestionsGateway {
  constructor(
    private readonly api: ApiClient,
    private readonly bus: UnauthorizedBus,
  ) {}

  async list(): Promise<SuggestionDto[]> {
    return unwrap(await this.api.api.v1.me.friends.suggestions.get(), { bus: this.bus }).items
  }

  async hide(userId: number): Promise<void> {
    unwrap(await this.api.api.v1.me.friends.suggestions({ id: userId }).hide.post(), {
      bus: this.bus,
    })
  }
}
