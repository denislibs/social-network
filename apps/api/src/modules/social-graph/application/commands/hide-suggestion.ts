import type { Command } from '../../../../kernel/command-bus'
import type { SuggestionCache, SuggestionHider } from '../ports'

export class HideSuggestion implements Command<void> {
  declare readonly __result: void
  constructor(readonly input: { me: number; other: number }) {}
}

export function hideSuggestionHandler(d: { hider: SuggestionHider; cache: SuggestionCache }) {
  return async (cmd: HideSuggestion) => {
    await d.hider.hide(cmd.input.me, cmd.input.other)
    await d.cache.invalidate([cmd.input.me])
  }
}
