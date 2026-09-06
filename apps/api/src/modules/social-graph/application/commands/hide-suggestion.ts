import type { Command } from '../../../../kernel/command-bus'
import { NotFoundError } from '../../../../kernel/errors'
import type { SuggestionCache, SuggestionHider, UserExistence } from '../ports'

export class HideSuggestion implements Command<void> {
  declare readonly __result: void
  constructor(readonly input: { me: number; other: number }) {}
}

export function hideSuggestionHandler(d: {
  hider: SuggestionHider
  users: UserExistence
  cache: SuggestionCache
}) {
  return async (cmd: HideSuggestion) => {
    // `friend_suggestion_hidden` has a foreign key on `hidden_id`; checking first turns a
    // nonexistent id into a 404 instead of a constraint violation surfacing as a 500.
    if (!(await d.users.exists(cmd.input.other)))
      throw new NotFoundError('user_not_found', 'User not found')
    await d.hider.hide(cmd.input.me, cmd.input.other)
    await d.cache.invalidate([cmd.input.me])
  }
}
