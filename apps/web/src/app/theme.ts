export type Theme = 'light' | 'dark' | 'system'

const KEY = 'vk-scheme'

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function setTheme(t: Theme): void {
  try {
    if (t === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, t)
  } catch {
    // localStorage may be unavailable (private mode, disabled cookies) — theme still applies
  }
  if (t === 'system') delete document.documentElement.dataset.vk
  else document.documentElement.dataset.vk = t
}

export function applySavedTheme(): void {
  setTheme(getTheme())
}
