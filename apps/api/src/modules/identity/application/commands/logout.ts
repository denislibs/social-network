import type { Command } from '../../../../kernel/command-bus'
import type { SessionStore } from '../ports'

export class Logout implements Command<void> {
  declare readonly __result: void
  constructor(readonly token: string) {}
}
export const logoutHandler = (d: { sessions: SessionStore }) => async (c: Logout) => {
  await d.sessions.delete(c.token)
}
