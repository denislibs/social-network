import { PanelSpinner } from '@vkontakte/vkui'
import { lazy, type ReactNode, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/entities/session'
import { AppShell, NAV_ITEMS } from '@/widgets/app-shell'

const FeedPage = lazy(() => import('@/pages/feed').then((m) => ({ default: m.FeedPage })))
const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('@/pages/register').then((m) => ({ default: m.RegisterPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found').then((m) => ({ default: m.NotFoundPage })),
)
const ComingSoonPage = lazy(() =>
  import('@/pages/coming-soon').then((m) => ({ default: m.ComingSoonPage })),
)

const S = (el: ReactNode) => <Suspense fallback={<PanelSpinner />}>{el}</Suspense>
const authed = (el: ReactNode) => S(<RequireAuth>{el}</RequireAuth>)

// Every nav destination resolves to a page: the ones without a real
// implementation yet get a placeholder instead of falling through to 404.
const comingSoonRoutes = NAV_ITEMS.filter((item) => item.to !== '/feed').map((item) => ({
  path: item.to,
  element: authed(<ComingSoonPage title={item.label} />),
}))

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Navigate to="/feed" replace /> },
      { path: '/feed', element: authed(<FeedPage />) },
      ...comingSoonRoutes,
      { path: '*', element: S(<NotFoundPage />) },
    ],
  },
  {
    element: <AppShell bare />,
    children: [
      { path: '/login', element: S(<LoginPage />) },
      { path: '/register', element: S(<RegisterPage />) },
    ],
  },
])
