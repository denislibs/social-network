import { Router } from '@solidjs/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { SnackbarHost } from '@vkc/ui-kit'
import { Layout } from './Layout'
import { AppRoutes } from './routes'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } })

export function App() {
  return (
    <QueryClientProvider client={qc}>
      <SnackbarHost>
        <Router root={(p) => <Layout>{p.children}</Layout>}>
          <AppRoutes />
        </Router>
      </SnackbarHost>
    </QueryClientProvider>
  )
}
