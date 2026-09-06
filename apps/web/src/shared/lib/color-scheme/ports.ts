import type { ServiceIdentifier } from '@/shared/di'
import type { ColorSchemeStore } from './store'

export interface PrefStorage {
  get(): string | null
  set(v: string): void
  remove(): void
}

export interface SystemScheme {
  prefersDark(): boolean
  subscribe(listener: () => void): () => void
}

export const PREF_STORAGE: ServiceIdentifier<PrefStorage> = Symbol('PrefStorage')
export const SYSTEM_SCHEME: ServiceIdentifier<SystemScheme> = Symbol('SystemScheme')
export const COLOR_SCHEME_STORE: ServiceIdentifier<ColorSchemeStore> = Symbol('ColorSchemeStore')
