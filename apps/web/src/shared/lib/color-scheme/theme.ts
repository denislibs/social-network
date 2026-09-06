export type ColorSchemePref = 'light' | 'dark' | 'system'
export type ColorScheme = 'light' | 'dark'

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
