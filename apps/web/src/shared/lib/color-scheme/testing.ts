import type { PrefStorage, SystemScheme } from './ports'

export function memPrefStorage(initial: string | null = null): PrefStorage {
  let v = initial
  return {
    get: () => v,
    set: (x) => {
      v = x
    },
    remove: () => {
      v = null
    },
  }
}

export function fakeSystemScheme(dark: boolean): { system: SystemScheme; flip: () => void } {
  const ls = new Set<() => void>()
  return {
    system: {
      prefersDark: () => dark,
      subscribe: (l: () => void) => {
        ls.add(l)
        return () => ls.delete(l)
      },
    },
    flip() {
      dark = !dark
      for (const l of ls) l()
    },
  }
}
