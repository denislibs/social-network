import { describe, expect, it, vi } from 'vitest'
import { createBrowserPrefStorage, createBrowserSystemScheme } from './browser'

describe('createBrowserPrefStorage', () => {
  it('round-trips a value through localStorage', () => {
    const storage = createBrowserPrefStorage('color-scheme-test')
    expect(storage.get()).toBeNull()
    storage.set('dark')
    expect(storage.get()).toBe('dark')
    storage.remove()
    expect(storage.get()).toBeNull()
  })

  it('returns null/no-throw when localStorage getters throw', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const storage = createBrowserPrefStorage('color-scheme-test')
    expect(storage.get()).toBeNull()
    expect(() => storage.set('dark')).not.toThrow()
    expect(() => storage.remove()).not.toThrow()
    getItem.mockRestore()
    setItem.mockRestore()
    removeItem.mockRestore()
  })
})

function stubMatchMedia(matches: boolean) {
  const addEventListener = vi.fn()
  const removeEventListener = vi.fn()
  const spy = vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  } as unknown as MediaQueryList)
  return { spy, addEventListener, removeEventListener }
}

function noop() {}

describe('createBrowserSystemScheme', () => {
  it('reflects matchMedia(...).matches', () => {
    const dark = stubMatchMedia(true)
    expect(createBrowserSystemScheme().prefersDark()).toBe(true)
    dark.spy.mockRestore()

    const light = stubMatchMedia(false)
    expect(createBrowserSystemScheme().prefersDark()).toBe(false)
    light.spy.mockRestore()
  })

  it('subscribe adds and its unsubscribe removes the change listener', () => {
    const { spy, addEventListener, removeEventListener } = stubMatchMedia(false)
    const system = createBrowserSystemScheme()

    const unsubscribe = system.subscribe(noop)
    expect(addEventListener).toHaveBeenCalledWith('change', noop)

    unsubscribe()
    expect(removeEventListener).toHaveBeenCalledWith('change', noop)

    spy.mockRestore()
  })
})
