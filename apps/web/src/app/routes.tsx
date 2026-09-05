import { Navigate, Route } from '@solidjs/router'
import { lazy } from 'solid-js'
import { RequireAuth } from './RequireAuth'

const FeedPage = lazy(() => import('~/features/feed/pages/FeedPage'))
const LoginPage = lazy(() => import('~/features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('~/features/auth/pages/RegisterPage'))

export function AppRoutes() {
  return (
    <>
      <Route path="/" component={() => <Navigate href="/feed" />} />
      <Route
        path="/feed"
        component={() => (
          <RequireAuth>
            <FeedPage />
          </RequireAuth>
        )}
      />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="*" component={() => <div>Страница не найдена</div>} />
    </>
  )
}
