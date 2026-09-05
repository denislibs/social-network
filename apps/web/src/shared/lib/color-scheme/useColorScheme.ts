import { useEffect, useSyncExternalStore } from 'react'
import {
  applyDocumentAttr,
  type ColorScheme,
  type ColorSchemePref,
  getPref,
  nextPref,
  resolveScheme,
  setPref,
} from './theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Предпочтение живёт в модуле, а не в useState: хук вызывают сразу несколько
 * потребителей (ConfigProvider в app и ThemeToggle в шапке), и у каждого своя
 * копия состояния означала бы, что переключатель меняет только себя.
 */
const listeners = new Set<() => void>()
let pref: ColorSchemePref | null = null

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function prefSnapshot(): ColorSchemePref {
  if (pref === null) pref = getPref()
  return pref
}

function subscribeSystem(listener: () => void): () => void {
  const mq = matchMedia(DARK_QUERY)
  mq.addEventListener('change', listener)
  return () => {
    mq.removeEventListener('change', listener)
  }
}

function systemSnapshot(): boolean {
  return matchMedia(DARK_QUERY).matches
}

export function useColorScheme(): {
  pref: ColorSchemePref
  scheme: ColorScheme
  cycle: () => void
} {
  const currentPref = useSyncExternalStore(subscribe, prefSnapshot)
  const prefersDark = useSyncExternalStore(subscribeSystem, systemSnapshot)
  const scheme = resolveScheme(currentPref, prefersDark)

  useEffect(() => {
    applyDocumentAttr(scheme)
  }, [scheme])

  return { pref: currentPref, scheme, cycle: cycleColorScheme }
}

export function cycleColorScheme(): void {
  pref = nextPref(prefSnapshot())
  setPref(pref)
  for (const listener of listeners) listener()
}
