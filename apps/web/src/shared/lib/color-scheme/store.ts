import type { PrefStorage, SystemScheme } from './ports'
import { type ColorScheme, type ColorSchemePref, nextPref, resolveScheme } from './theme'

export class ColorSchemeStore {
  private pref: ColorSchemePref
  private readonly listeners = new Set<() => void>()

  constructor(
    private readonly storage: PrefStorage,
    private readonly system: SystemScheme,
  ) {
    const v = storage.get()
    this.pref = v === 'light' || v === 'dark' ? v : 'system'
    system.subscribe(() => this.notify())
  }

  getPref(): ColorSchemePref {
    return this.pref
  }

  getScheme(): ColorScheme {
    return resolveScheme(this.pref, this.system.prefersDark())
  }

  cycle(): void {
    this.pref = nextPref(this.pref)
    if (this.pref === 'system') this.storage.remove()
    else this.storage.set(this.pref)
    this.notify()
  }

  /** Arrow-function property: stable identity across renders for useSyncExternalStore. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const l of this.listeners) l()
  }
}
