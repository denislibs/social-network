import { describe, expect, it, vi } from 'vitest'
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
  it('is immediately leader when the Web Locks API is unavailable', () => {
    const coordinator = createBrowserTabCoordinator()
    expect(coordinator.isLeader()).toBe(true)
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
})
