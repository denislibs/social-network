import { PanelSpinner } from '@vkontakte/vkui'
import { lazy, type ReactNode, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/entities/session'
import { AppShell } from '@/widgets/app-shell'

const FeedPage = lazy(() => import('@/pages/feed').then((m) => ({ default: m.FeedPage })))
const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('@/pages/register').then((m) => ({ default: m.RegisterPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found').then((m) => ({ default: m.NotFoundPage })),
)

const S = (el: ReactNode) => <Suspense fallback={<PanelSpinner />}>{el}</Suspense>

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Navigate to="/feed" replace /> },
      {
        path: '/feed',
        element: S(
          <RequireAuth>
            <FeedPage />
          </RequireAuth>,
        ),
      },
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
