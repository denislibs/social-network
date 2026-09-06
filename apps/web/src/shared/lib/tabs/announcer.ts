/**
 * Decides which tab should perform a cross-tab side effect that must happen exactly
 * once (e.g. show a toast/notification). The active (focused, visible) tab announces
 * so the user sees it on the tab they're looking at; if no tab is active, the elected
 * leader announces instead so the effect still happens somewhere.
 */
export function pickAnnouncer(s: {
  isLeader: boolean
  isActive: boolean
  anyActive: boolean
}): boolean {
  if (s.isActive) return true
  if (!s.anyActive) return s.isLeader
  return false
}
