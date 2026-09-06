import type { ReactNode } from 'react'
import { type Container, createContainer } from './container'
import { DiProvider } from './DiProvider'

export function createTestContainer(): Container {
  return createContainer()
}

/** Wrapper for RTL `render`/`renderHook`: `renderHook(useX, { wrapper: withDi(container) })`. */
export function withDi(container: Container) {
  return function DiWrapper({ children }: { children: ReactNode }) {
    return <DiProvider container={container}>{children}</DiProvider>
  }
}
