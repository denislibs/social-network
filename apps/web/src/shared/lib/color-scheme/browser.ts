import type { PrefStorage, SystemScheme } from './ports'

function safe<T>(f: () => T, fallback: T): T {
  try {
    return f()
  } catch {
    return fallback
  }
}

export function createBrowserPrefStorage(key: string): PrefStorage {
  return {
    get: () => safe(() => localStorage.getItem(key), null),
    set: (v) => safe(() => localStorage.setItem(key, v), undefined),
    remove: () => safe(() => localStorage.removeItem(key), undefined),
  }
}

export function createBrowserSystemScheme(): SystemScheme {
  const mq = matchMedia('(prefers-color-scheme: dark)')
  return {
    prefersDark: () => mq.matches,
    subscribe: (l) => {
      mq.addEventListener('change', l)
      return () => mq.removeEventListener('change', l)
    },
  }
}
