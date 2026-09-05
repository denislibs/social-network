import { useCallback, useEffect, useState } from 'react'
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

export function useColorScheme(): {
  pref: ColorSchemePref
  scheme: ColorScheme
  cycle: () => void
} {
  const [pref, setPrefState] = useState<ColorSchemePref>(getPref)
  const [prefersDark, setPrefersDark] = useState(() => matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const mq = matchMedia(DARK_QUERY)
    const on = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const scheme = resolveScheme(pref, prefersDark)

  useEffect(() => {
    applyDocumentAttr(scheme)
  }, [scheme])

  const cycle = useCallback(() => {
    const n = nextPref(pref)
    setPref(n)
    setPrefState(n)
  }, [pref])

  return { pref, scheme, cycle }
}
