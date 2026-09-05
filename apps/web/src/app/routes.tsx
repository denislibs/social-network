import { Navigate, Route } from '@solidjs/router'
import { lazy } from 'solid-js'

const FeedPage = lazy(() => import('~/features/feed/pages/FeedPage'))

// TODO(Task 22): заменить на реальные страницы `~/features/auth/pages/{LoginPage,RegisterPage}`
const LoginPage = () => <div>login</div>
const RegisterPage = () => <div>register</div>

export function AppRoutes() {
  return (
    <>
      <Route path="/" component={() => <Navigate href="/feed" />} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="*" component={() => <div>Страница не найдена</div>} />
    </>
  )
}
