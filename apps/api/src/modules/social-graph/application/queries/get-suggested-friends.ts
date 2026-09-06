import type { Query } from '../../../../kernel/query-bus'
import type { SuggestionDto } from '../dto'
import type { SocialReadModel, SuggestionCache } from '../ports'

const SUGGESTIONS_TTL_SECONDS = 600

export class GetSuggestedFriends implements Query<SuggestionDto[]> {
  declare readonly __result: SuggestionDto[]
  constructor(readonly me: number) {}
}

export const getSuggestedFriendsHandler =
  (d: { read: SocialReadModel; cache: SuggestionCache }) =>
  async (q: GetSuggestedFriends): Promise<SuggestionDto[]> => {
    const cached = await d.cache.get(q.me)
    if (cached) return cached
    const items = await d.read.suggestions(q.me)
    await d.cache.set(q.me, items, SUGGESTIONS_TTL_SECONDS)
    return items
  }
