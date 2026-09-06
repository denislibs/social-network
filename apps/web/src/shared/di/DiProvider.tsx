import { createContext, type ReactNode } from 'react'
import type { Container } from './container'

export const DiContext = createContext<Container | null>(null)

export function DiProvider({ container, children }: { container: Container; children: ReactNode }) {
  return <DiContext.Provider value={container}>{children}</DiContext.Provider>
}
