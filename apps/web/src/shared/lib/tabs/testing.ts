import type { TabCoordinator, TabMessage } from './ports'

export { pickAnnouncer } from './announcer'

function setActive(t: FakeTab, active: boolean): void {
  if (t.active === active) return
  t.active = active
  for (const l of t.activeListeners) l(active)
  t.broadcast({ type: 'tab:active', tabId: t.tabId, active })
}

interface FakeTab extends TabCoordinator {
  closed: boolean
  leader: boolean
  active: boolean
  readonly leaderListeners: Set<(leader: boolean) => void>
  readonly activeListeners: Set<(active: boolean) => void>
  readonly messageListeners: Set<(msg: TabMessage) => void>
}

/**
 * In-memory multi-tab cluster for tests: a shared bus standing in for
 * `BroadcastChannel`/Web Locks so cross-tab behaviour (leader election, activity,
 * message fan-out) can be exercised synchronously without jsdom/browser APIs.
 */
export function fakeTabCluster(n: number): {
  tabs: TabCoordinator[]
  close(i: number): void
  focus(i: number): void
  blurAll(): void
} {
  const tabs: FakeTab[] = []

  function makeTab(i: number): FakeTab {
    const leaderListeners = new Set<(leader: boolean) => void>()
    const activeListeners = new Set<(active: boolean) => void>()
    const messageListeners = new Set<(msg: TabMessage) => void>()
    const tab: FakeTab = {
      tabId: `tab-${i}`,
      closed: false,
      leader: false,
      active: false,
      leaderListeners,
      activeListeners,
      messageListeners,
      isLeader: () => tab.leader,
      onLeaderChange: (cb) => {
        leaderListeners.add(cb)
        return () => leaderListeners.delete(cb)
      },
      isActive: () => tab.active,
      onActiveChange: (cb) => {
        activeListeners.add(cb)
        return () => activeListeners.delete(cb)
      },
      broadcast: (msg) => {
        for (const other of tabs) {
          if (other !== tab && !other.closed) {
            for (const l of other.messageListeners) l(msg)
          }
        }
      },
      subscribe: (cb) => {
        messageListeners.add(cb)
        return () => messageListeners.delete(cb)
      },
    }
    return tab
  }

  for (let i = 0; i < n; i++) tabs.push(makeTab(i))

  function elect(): void {
    const leaderIndex = tabs.findIndex((t) => !t.closed)
    for (const [i, t] of tabs.entries()) {
      const shouldBeLeader = i === leaderIndex
      if (t.leader !== shouldBeLeader) {
        t.leader = shouldBeLeader
        for (const l of t.leaderListeners) l(shouldBeLeader)
      }
    }
  }

  elect()

  return {
    tabs,
    close(i: number) {
      const t = tabs[i]
      if (!t || t.closed) return
      t.closed = true
      elect()
    },
    focus(i: number) {
      for (const [idx, t] of tabs.entries()) setActive(t, idx === i)
    },
    blurAll() {
      for (const t of tabs) setActive(t, false)
    },
  }
}
