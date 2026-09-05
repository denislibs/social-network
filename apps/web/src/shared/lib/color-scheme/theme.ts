import { STORAGE_KEYS } from '@/shared/config'

export type ColorSchemePref = 'light' | 'dark' | 'system'
export type ColorScheme = 'light' | 'dark'

export function getPref(): ColorSchemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.colorScheme)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function setPref(p: ColorSchemePref): void {
  try {
    if (p === 'system') {
      localStorage.removeItem(STORAGE_KEYS.colorScheme)
    } else {
      localStorage.setItem(STORAGE_KEYS.colorScheme, p)
    }
  } catch {
    // приватный режим/заблокированное хранилище — молча остаёмся на выбранной в памяти схеме
  }
}

export function resolveScheme(p: ColorSchemePref, prefersDark: boolean): ColorScheme {
  return p === 'system' ? (prefersDark ? 'dark' : 'light') : p
}

export function nextPref(p: ColorSchemePref): ColorSchemePref {
  return p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light'
}

export function applyDocumentAttr(scheme: ColorScheme): void {
  document.documentElement.style.colorScheme = scheme
  document.documentElement.style.background = ''
}
