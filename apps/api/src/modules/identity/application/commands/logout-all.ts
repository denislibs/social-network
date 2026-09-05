import type { Command } from '../../../../kernel/command-bus'
import type { SessionStore } from '../ports'

export class LogoutAll implements Command<void> {
  declare readonly __result: void
  constructor(readonly userId: number) {}
}
export const logoutAllHandler = (d: { sessions: SessionStore }) => async (c: LogoutAll) => {
  await d.sessions.deleteAllForUser(c.userId)
}
