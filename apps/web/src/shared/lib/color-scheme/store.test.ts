import { describe, expect, it, vi } from 'vitest'
import { ColorSchemeStore } from './store'
import { fakeSystemScheme, memPrefStorage } from './testing'

describe('ColorSchemeStore', () => {
  it('starts from storage, falls back to system', () => {
    expect(
      new ColorSchemeStore(memPrefStorage('dark'), fakeSystemScheme(false).system).getScheme(),
    ).toBe('dark')
    expect(
      new ColorSchemeStore(memPrefStorage(null), fakeSystemScheme(true).system).getScheme(),
    ).toBe('dark')
    expect(
      new ColorSchemeStore(memPrefStorage('garbage'), fakeSystemScheme(false).system).getPref(),
    ).toBe('system')
  })
  it('cycles light → dark → system → light and persists', () => {
    const st = memPrefStorage(null)
    const store = new ColorSchemeStore(st, fakeSystemScheme(false).system)
    const l = vi.fn()
    store.subscribe(l)
    store.cycle()
    expect(store.getPref()).toBe('light')
    expect(st.get()).toBe('light')
    store.cycle()
    expect(store.getPref()).toBe('dark')
    expect(st.get()).toBe('dark')
    store.cycle()
    expect(store.getPref()).toBe('system')
    expect(st.get()).toBeNull()
    expect(l).toHaveBeenCalledTimes(3)
  })
  it('notifies when the system scheme changes while pref is system', () => {
    const sys = fakeSystemScheme(false)
    const store = new ColorSchemeStore(memPrefStorage(null), sys.system)
    const l = vi.fn()
    store.subscribe(l)
    sys.flip()
    expect(l).toHaveBeenCalledTimes(1)
    expect(store.getScheme()).toBe('dark')
  })
})
