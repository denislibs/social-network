import type { TabCoordinator, TabMessage } from './ports'

function computeActive(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

/**
 * Browser `TabCoordinator`: leadership is arbitrated via the Web Locks API (the tab holding an
 * indefinitely-pending `navigator.locks.request` lock is the leader; when that tab closes or
 * releases, the browser hands the lock to another tab's pending request), cross-tab messages
 * travel over a shared `BroadcastChannel`, and "active" tracks whether this tab is the visible,
 * focused one.
 *
 * Leadership is also *opt-in*: the lock is only requested once `setEligible(true)` is called, and
 * `setEligible(false)` releases it again. That is what keeps a signed-out tab from squatting on
 * the lock (see `TabCoordinator.setEligible`) and what makes logout hand leadership straight over
 * to another tab instead of waiting for this one to close.
 */
export function createBrowserTabCoordinator(): TabCoordinator & { dispose(): void } {
  const tabId = crypto.randomUUID()
  let leader = false
  const leaderListeners = new Set<(leader: boolean) => void>()

  const channel = new BroadcastChannel('vkc')
  const messageListeners = new Set<(msg: TabMessage) => void>()
  const onMessage = (event: MessageEvent<TabMessage>) => {
    for (const l of messageListeners) l(event.data)
  }
  channel.addEventListener('message', onMessage)

  function broadcast(msg: TabMessage): void {
    // `BroadcastChannel.postMessage` (unlike `window.postMessage`) takes only the
    // message: delivery is scoped to same-origin, same-name channels by spec, so
    // there is no `targetOrigin` parameter to pass.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    channel.postMessage(msg)
  }

  let active = computeActive()
  const activeListeners = new Set<(active: boolean) => void>()
  const onActivityEvent = () => {
    const next = computeActive()
    if (next === active) return
    active = next
    for (const l of activeListeners) l(active)
    broadcast({ type: 'tab:active', tabId, active })
  }
  document.addEventListener('visibilitychange', onActivityEvent)
  window.addEventListener('focus', onActivityEvent)
  window.addEventListener('blur', onActivityEvent)

  function setLeader(next: boolean): void {
    if (leader === next) return
    leader = next
    for (const l of leaderListeners) l(next)
  }

  let eligible = false
  /** Resolving this hands the Web Lock back to the browser; `null` while no request is in flight. */
  let releaseHeldLock: (() => void) | null = null

  function acquire(): void {
    if (!navigator.locks) {
      // No Web Locks (jsdom, very old browsers): there is nothing to arbitrate with, so an
      // eligible tab simply considers itself the leader.
      setLeader(true)
      return
    }
    if (releaseHeldLock) return
    let handBack!: () => void
    const held = new Promise<void>((resolve) => {
      handBack = resolve
    })
    releaseHeldLock = handBack
    // The callback's promise stays pending for as long as this tab should lead: that is what
    // holds the lock. The `.catch` is not error *handling* — a rejection (e.g. `AbortError`)
    // just means this tab never became leader, which is already the default state; it only
    // keeps the rejection from surfacing as an unhandled one.
    void navigator.locks
      .request('vkc-leader', () => {
        // Eligibility can be withdrawn while the request is still queued behind another tab.
        if (!eligible) return Promise.resolve()
        setLeader(true)
        return held
      })
      .catch(() => {})
  }

  function release(): void {
    setLeader(false)
    releaseHeldLock?.()
    releaseHeldLock = null
  }

  return {
    tabId,
    setEligible: (next: boolean) => {
      if (eligible === next) return
      eligible = next
      if (next) acquire()
      else release()
    },
    isLeader: () => leader,
    onLeaderChange: (cb) => {
      leaderListeners.add(cb)
      return () => leaderListeners.delete(cb)
    },
    isActive: () => active,
    onActiveChange: (cb) => {
      activeListeners.add(cb)
      return () => activeListeners.delete(cb)
    },
    broadcast,
    subscribe: (cb) => {
      messageListeners.add(cb)
      return () => messageListeners.delete(cb)
    },
    dispose: () => {
      eligible = false
      release()
      channel.removeEventListener('message', onMessage)
      channel.close()
      document.removeEventListener('visibilitychange', onActivityEvent)
      window.removeEventListener('focus', onActivityEvent)
      window.removeEventListener('blur', onActivityEvent)
    },
  }
}
