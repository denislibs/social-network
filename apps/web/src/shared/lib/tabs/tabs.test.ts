import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBrowserTabCoordinator } from './browser'
import { fakeTabCluster, pickAnnouncer } from './testing'

describe('fakeTabCluster', () => {
  it('exactly one leader; closing the leader promotes the next', () => {
    const c = fakeTabCluster(3)
    expect(c.tabs.filter((t) => t.isLeader())).toHaveLength(1)
    const onChange = vi.fn()
    c.tabs[1]!.onLeaderChange(onChange)
    c.close(0)
    expect(c.tabs[1]!.isLeader()).toBe(true)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('an ineligible (signed-out) tab never leads while an eligible one exists', () => {
    const c = fakeTabCluster(2)
    c.tabs[0]!.setEligible(false)
    expect(c.tabs[0]!.isLeader()).toBe(false)
    expect(c.tabs[1]!.isLeader()).toBe(true)
  })

  it('the leader going ineligible (logout) hands leadership to the next tab', () => {
    const c = fakeTabCluster(2)
    expect(c.tabs[0]!.isLeader()).toBe(true)
    const onChange = vi.fn()
    c.tabs[1]!.onLeaderChange(onChange)

    c.tabs[0]!.setEligible(false)

    expect(c.tabs[0]!.isLeader()).toBe(false)
    expect(c.tabs[1]!.isLeader()).toBe(true)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('no tab leads while every tab is ineligible', () => {
    const c = fakeTabCluster(2)
    for (const t of c.tabs) t.setEligible(false)
    expect(c.tabs.filter((t) => t.isLeader())).toHaveLength(0)
  })

  it('broadcast reaches every other tab, not the sender', () => {
    const c = fakeTabCluster(2)
    const got = vi.fn()
    c.tabs[1]!.subscribe(got)
    const self = vi.fn()
    c.tabs[0]!.subscribe(self)
    c.tabs[0]!.broadcast({ type: 'notifications:changed', unread: 3 })
    expect(got).toHaveBeenCalledWith({ type: 'notifications:changed', unread: 3 })
    expect(self).not.toHaveBeenCalled()
  })

  it('focus marks one tab active and notifies', () => {
    const c = fakeTabCluster(2)
    const cb = vi.fn()
    c.tabs[1]!.onActiveChange(cb)
    c.focus(1)
    expect(c.tabs[1]!.isActive()).toBe(true)
    expect(c.tabs[0]!.isActive()).toBe(false)
    expect(cb).toHaveBeenCalledWith(true)
  })

  it('focus relays a tab:active message to the other tabs', () => {
    const c = fakeTabCluster(2)
    const got = vi.fn()
    c.tabs[0]!.subscribe(got)
    c.focus(1)
    expect(got).toHaveBeenCalledWith({ type: 'tab:active', tabId: 'tab-1', active: true })
  })

  it('blurAll marks every tab inactive', () => {
    const c = fakeTabCluster(2)
    c.focus(1)
    const cb = vi.fn()
    c.tabs[1]!.onActiveChange(cb)
    c.blurAll()
    expect(c.tabs[1]!.isActive()).toBe(false)
    expect(cb).toHaveBeenCalledWith(false)
  })

  it('subscribe: the returned unsubscribe stops further messages to that listener', () => {
    const c = fakeTabCluster(2)
    const cb = vi.fn()
    const unsubscribe = c.tabs[1]!.subscribe(cb)
    unsubscribe()
    c.tabs[0]!.broadcast({ type: 'notifications:changed', unread: 1 })
    expect(cb).not.toHaveBeenCalled()
  })

  it('onLeaderChange: the returned unsubscribe stops further leader notifications', () => {
    const c = fakeTabCluster(2)
    const cb = vi.fn()
    const unsubscribe = c.tabs[1]!.onLeaderChange(cb)
    unsubscribe()
    c.close(0)
    expect(c.tabs[1]!.isLeader()).toBe(true)
    expect(cb).not.toHaveBeenCalled()
  })

  it('onActiveChange: the returned unsubscribe stops further active notifications', () => {
    const c = fakeTabCluster(2)
    const cb = vi.fn()
    const unsubscribe = c.tabs[1]!.onActiveChange(cb)
    unsubscribe()
    c.focus(1)
    expect(c.tabs[1]!.isActive()).toBe(true)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('pickAnnouncer', () => {
  it.each([
    [{ isLeader: true, isActive: true, anyActive: true }, true],
    [{ isLeader: false, isActive: true, anyActive: true }, true],
    [{ isLeader: true, isActive: false, anyActive: true }, false],
    [{ isLeader: true, isActive: false, anyActive: false }, true],
    [{ isLeader: false, isActive: false, anyActive: false }, false],
  ])('%o → %s', (s, want) => {
    expect(pickAnnouncer(s)).toBe(want)
  })
})

describe('createBrowserTabCoordinator', () => {
  it('is not a leader until it is made eligible, even without the Web Locks API', () => {
    const coordinator = createBrowserTabCoordinator()
    expect(coordinator.isLeader()).toBe(false)

    coordinator.setEligible(true)
    expect(coordinator.isLeader()).toBe(true)

    coordinator.setEligible(false)
    expect(coordinator.isLeader()).toBe(false)

    coordinator.dispose()
  })

  it('has a unique tabId', () => {
    const a = createBrowserTabCoordinator()
    const b = createBrowserTabCoordinator()
    expect(a.tabId).not.toBe(b.tabId)
    a.dispose()
    b.dispose()
  })

  it('broadcasts to other coordinators on the same channel, not to itself', async () => {
    const a = createBrowserTabCoordinator()
    const b = createBrowserTabCoordinator()
    const gotB = vi.fn()
    const gotA = vi.fn()
    b.subscribe(gotB)
    a.subscribe(gotA)

    a.broadcast({ type: 'notifications:changed', unread: 2 })

    await vi.waitFor(() => {
      expect(gotB).toHaveBeenCalledWith({ type: 'notifications:changed', unread: 2 })
    })
    expect(gotA).not.toHaveBeenCalled()

    a.dispose()
    b.dispose()
  })

  it('dispose stops delivering broadcasts to that coordinator', async () => {
    const a = createBrowserTabCoordinator()
    const b = createBrowserTabCoordinator()
    const gotB = vi.fn()
    b.subscribe(gotB)
    b.dispose()

    a.broadcast({ type: 'notifications:changed', unread: 1 })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(gotB).not.toHaveBeenCalled()

    a.dispose()
  })

  it('subscribe: the returned unsubscribe stops further messages without disposing the coordinator', async () => {
    const a = createBrowserTabCoordinator()
    const b = createBrowserTabCoordinator()
    const gotB = vi.fn()
    const unsubscribe = b.subscribe(gotB)
    unsubscribe()

    a.broadcast({ type: 'notifications:changed', unread: 7 })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(gotB).not.toHaveBeenCalled()

    a.dispose()
    b.dispose()
  })

  it('onActiveChange: the returned unsubscribe stops further active notifications', () => {
    const hasFocusSpy = vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    const coordinator = createBrowserTabCoordinator()
    const cb = vi.fn()
    const unsubscribe = coordinator.onActiveChange(cb)
    unsubscribe()

    hasFocusSpy.mockReturnValue(false)
    window.dispatchEvent(new Event('blur'))

    expect(coordinator.isActive()).toBe(false)
    expect(cb).not.toHaveBeenCalled()

    coordinator.dispose()
    hasFocusSpy.mockRestore()
  })

  it('dispose removes the visibilitychange/focus/blur listeners and closes the channel', () => {
    const docRemoveSpy = vi.spyOn(document, 'removeEventListener')
    const winRemoveSpy = vi.spyOn(window, 'removeEventListener')
    const closeSpy = vi.spyOn(BroadcastChannel.prototype, 'close')

    const coordinator = createBrowserTabCoordinator()
    coordinator.dispose()

    expect(docRemoveSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(winRemoveSpy).toHaveBeenCalledWith('focus', expect.any(Function))
    expect(winRemoveSpy).toHaveBeenCalledWith('blur', expect.any(Function))
    expect(closeSpy).toHaveBeenCalledTimes(1)

    docRemoveSpy.mockRestore()
    winRemoveSpy.mockRestore()
    closeSpy.mockRestore()
  })
})

describe('createBrowserTabCoordinator leadership via the real Web Locks API', () => {
  // jsdom does not implement `navigator.locks`, so every test above exercises only the
  // "Web Locks unavailable" fallback branch. These tests stub `navigator.locks` to drive
  // the actual `navigator.locks.request('vkc-leader', …)` branch in `browser.ts`.
  const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks')

  afterEach(() => {
    if (originalLocks) {
      Object.defineProperty(navigator, 'locks', originalLocks)
    } else {
      // @ts-expect-error -- jsdom has no `locks`; removing the stub restores that.
      delete navigator.locks
    }
  })

  it('lock granted: becomes leader and notifies a listener registered right after creation, exactly once', async () => {
    const request = vi.fn(
      (_name: string, _opts: { signal: AbortSignal }, cb: () => Promise<void>) =>
        Promise.resolve().then(cb),
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    const onChange = vi.fn()
    coordinator.onLeaderChange(onChange)
    coordinator.setEligible(true)

    expect(coordinator.isLeader()).toBe(false)

    await vi.waitFor(() => {
      expect(coordinator.isLeader()).toBe(true)
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(true)
    expect(request).toHaveBeenCalledWith(
      'vkc-leader',
      { signal: expect.any(AbortSignal) },
      expect.any(Function),
    )

    coordinator.dispose()
  })

  it('lock not granted: stays a non-leader and never notifies', async () => {
    const request = vi.fn(
      (_name: string, _opts: { signal: AbortSignal }, _cb: () => Promise<void>) =>
        new Promise<void>(() => {}),
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    const onChange = vi.fn()
    coordinator.onLeaderChange(onChange)
    coordinator.setEligible(true)

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(coordinator.isLeader()).toBe(false)
    expect(onChange).not.toHaveBeenCalled()

    coordinator.dispose()
  })

  it('lock granted later: leader flips to true and the listener fires once the callback runs', () => {
    let grantedCb: (() => Promise<void>) | undefined
    const request = vi.fn(
      (_name: string, _opts: { signal: AbortSignal }, cb: () => Promise<void>) => {
        grantedCb = cb
        return new Promise<void>(() => {})
      },
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    const onChange = vi.fn()
    coordinator.onLeaderChange(onChange)
    coordinator.setEligible(true)

    expect(coordinator.isLeader()).toBe(false)
    expect(onChange).not.toHaveBeenCalled()

    grantedCb?.()

    expect(coordinator.isLeader()).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(true)

    coordinator.dispose()
  })

  it('onLeaderChange: the returned unsubscribe stops further leader notifications', () => {
    let grantedCb: (() => Promise<void>) | undefined
    const request = vi.fn(
      (_name: string, _opts: { signal: AbortSignal }, cb: () => Promise<void>) => {
        grantedCb = cb
        return new Promise<void>(() => {})
      },
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    const onChange = vi.fn()
    const unsubscribe = coordinator.onLeaderChange(onChange)
    unsubscribe()
    coordinator.setEligible(true)

    grantedCb?.()

    expect(coordinator.isLeader()).toBe(true)
    expect(onChange).not.toHaveBeenCalled()

    coordinator.dispose()
  })

  it('never requests the lock while the tab is ineligible', async () => {
    const request = vi.fn(
      (_name: string, _opts: { signal: AbortSignal }, _cb: () => Promise<void>) =>
        new Promise<void>(() => {}),
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(request).not.toHaveBeenCalled()
    expect(coordinator.isLeader()).toBe(false)

    coordinator.dispose()
  })

  it('setEligible(false) releases the held lock so another tab can take it', () => {
    let held: Promise<void> | undefined
    const request = vi.fn(
      (_name: string, _opts: { signal: AbortSignal }, cb: () => Promise<void>) => {
        held = cb()
        return held
      },
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    coordinator.setEligible(true)
    expect(coordinator.isLeader()).toBe(true)

    const settled = vi.fn()
    void held?.then(settled)

    coordinator.setEligible(false)

    expect(coordinator.isLeader()).toBe(false)
    // Resolving the callback's promise is what hands the Web Lock back to the browser.
    return Promise.resolve().then(() => {
      expect(settled).toHaveBeenCalled()
      coordinator.dispose()
    })
  })

  it('a lock granted after eligibility was withdrawn does not make the tab a leader', () => {
    let grantedCb: (() => Promise<void>) | undefined
    const request = vi.fn(
      (_name: string, _opts: { signal: AbortSignal }, cb: () => Promise<void>) => {
        grantedCb = cb
        return new Promise<void>(() => {})
      },
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    coordinator.setEligible(true)
    coordinator.setEligible(false)

    grantedCb?.()

    expect(coordinator.isLeader()).toBe(false)
    coordinator.dispose()
  })

  it('does not produce an unhandled rejection when the lock request rejects', async () => {
    const request = vi.fn(
      (_name: string, _opts: { signal: AbortSignal }, _cb: () => Promise<void>) =>
        Promise.reject(new DOMException('aborted', 'AbortError')),
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const onUnhandledRejection = vi.fn()
    process.on('unhandledRejection', onUnhandledRejection)

    const coordinator = createBrowserTabCoordinator()
    coordinator.setEligible(true)
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(coordinator.isLeader()).toBe(false)
    expect(onUnhandledRejection).not.toHaveBeenCalled()

    process.off('unhandledRejection', onUnhandledRejection)
    coordinator.dispose()
  })

  it('setEligible(false) aborts a still-queued lock request', () => {
    let capturedSignal: AbortSignal | undefined
    const request = vi.fn(
      (_name: string, opts: { signal: AbortSignal }, _cb: () => Promise<void>) => {
        capturedSignal = opts.signal
        return new Promise<void>(() => {}) // never granted: stays queued behind another tab
      },
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    coordinator.setEligible(true)
    expect(capturedSignal?.aborted).toBe(false)

    coordinator.setEligible(false)

    expect(capturedSignal?.aborted).toBe(true)

    coordinator.dispose()
  })

  it('a grant delivered after the request was aborted does not make the tab a leader', () => {
    let grantedCb: (() => Promise<void>) | undefined
    let capturedSignal: AbortSignal | undefined
    const request = vi.fn(
      (_name: string, opts: { signal: AbortSignal }, cb: () => Promise<void>) => {
        capturedSignal = opts.signal
        grantedCb = cb
        return new Promise<void>(() => {})
      },
    )
    Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })

    const coordinator = createBrowserTabCoordinator()
    const onChange = vi.fn()
    coordinator.onLeaderChange(onChange)

    // Tab toggles eligible→ineligible while the request for the lock is still queued behind
    // another tab holding it (the callback is never invoked while queued, exactly like the
    // real Web Locks API): the queued request must be aborted, not merely ignored client-side.
    coordinator.setEligible(true)
    coordinator.setEligible(false)
    expect(capturedSignal?.aborted).toBe(true)

    // The stale request is later (incorrectly, in a buggy implementation) granted anyway —
    // simulating the browser handing the lock to this tab's now-aborted queued request.
    grantedCb?.()

    expect(coordinator.isLeader()).toBe(false)
    expect(onChange).not.toHaveBeenCalledWith(true)

    coordinator.dispose()
  })
})
