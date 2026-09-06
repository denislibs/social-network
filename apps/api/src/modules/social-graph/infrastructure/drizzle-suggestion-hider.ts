import type { Db } from '../../../db/client'
import { friendSuggestionHidden } from '../../../db/schema'
import type { SuggestionHider } from '../application/ports'

export class DrizzleSuggestionHider implements SuggestionHider {
  constructor(private db: Db) {}

  async hide(userId: number, hiddenId: number): Promise<void> {
    await this.db.insert(friendSuggestionHidden).values({ userId, hiddenId }).onConflictDoNothing()
  }
}
