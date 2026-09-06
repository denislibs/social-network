import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { type Container, withDi } from '@/shared/di'

/**
 * Wrapper for RTL `render`/`renderHook` that nests `DiProvider` (a test container with
 * fake bindings, via `withDi`) inside `QueryClientProvider`. Pass a `QueryClient` when a
 * test needs to inspect/seed the cache directly; otherwise one is created with
 * `retry: false` so failed queries don't retry and slow down or flake tests.
 */
export function withProviders(container: Container, client?: QueryClient) {
  const queryClient = client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const DiWrapper = withDi(container)
  return function ProvidersWrapper({ children }: { children: ReactNode }) {
    return (
      <DiWrapper>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </DiWrapper>
    )
  }
}
