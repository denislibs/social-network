import type { TabCoordinator, TabMessage } from './ports'

function computeActive(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus()
}

/**
 * Browser `TabCoordinator`: leadership is arbitrated via the Web Locks API (the tab
 * holding an indefinitely-pending `navigator.locks.request` lock is the leader; when
 * that tab closes, the browser releases the lock and another tab's pending request
 * wins), cross-tab messages travel over a shared `BroadcastChannel`, and "active" tracks
 * whether this tab is the visible, focused one.
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

  if (navigator.locks) {
    // This request never resolves on purpose: holding the lock for the tab's whole
    // lifetime is what makes it "the leader" until the tab closes and the browser
    // reclaims the lock for the next tab's pending request.
    void navigator.locks.request('vkc-leader', () => {
      leader = true
      for (const l of leaderListeners) l(true)
      return new Promise<void>(() => {})
    })
  } else {
    leader = true
  }

  return {
    tabId,
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
      channel.removeEventListener('message', onMessage)
      channel.close()
      document.removeEventListener('visibilitychange', onActivityEvent)
      window.removeEventListener('focus', onActivityEvent)
      window.removeEventListener('blur', onActivityEvent)
    },
  }
}
