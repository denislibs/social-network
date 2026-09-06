import { useEffect, useSyncExternalStore } from 'react'
import { useService } from '@/shared/di'
import { COLOR_SCHEME_STORE } from './ports'
import { applyDocumentAttr, type ColorScheme, type ColorSchemePref } from './theme'

export function useColorScheme(): {
  pref: ColorSchemePref
  scheme: ColorScheme
  cycle: () => void
} {
  const store = useService(COLOR_SCHEME_STORE)
  const pref = useSyncExternalStore(store.subscribe, () => store.getPref())
  const scheme = useSyncExternalStore(store.subscribe, () => store.getScheme())

  useEffect(() => {
    applyDocumentAttr(scheme)
  }, [scheme])

  return { pref, scheme, cycle: () => store.cycle() }
}
