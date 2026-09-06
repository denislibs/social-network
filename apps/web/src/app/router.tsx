import { PanelSpinner } from '@vkontakte/vkui'
import { lazy, type ReactNode, Suspense } from 'react'
import { createBrowserRouter, Navigate, type RouteObject, useParams } from 'react-router'
import { RequireAuth, useSession } from '@/entities/session'
import { AppShell, NAV_ITEMS } from '@/widgets/app-shell'
import { PymkBlock } from '@/widgets/pymk-block'

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
const HandleRoute = lazy(() =>
  import('@/app/routes/HandleRoute').then((m) => ({ default: m.HandleRoute })),
)
const FriendsPage = lazy(() => import('@/pages/friends').then((m) => ({ default: m.FriendsPage })))
const CommunitiesPage = lazy(() =>
  import('@/pages/communities').then((m) => ({ default: m.CommunitiesPage })),
)
const ProfileFriendsPage = lazy(() =>
  import('@/pages/profile').then((m) => ({ default: m.ProfileFriendsPage })),
)
const CommunityMembersPage = lazy(() =>
  import('@/pages/community').then((m) => ({ default: m.CommunityMembersPage })),
)
const SearchPage = lazy(() => import('@/pages/search').then((m) => ({ default: m.SearchPage })))
const EditProfilePage = lazy(() =>
  import('@/pages/edit-profile').then((m) => ({ default: m.EditProfilePage })),
)

const S = (el: ReactNode) => <Suspense fallback={<PanelSpinner />}>{el}</Suspense>
const authed = (el: ReactNode) => S(<RequireAuth>{el}</RequireAuth>)

/** `/:handle/friends` is a route on its own (not nested under `HandlePage`, whose job is only
 * to tell a user handle from a community one), so it reads the `:handle` param itself and
 * forwards it as a prop — matching how `ProfileFriendsPage` is tested in isolation. */
function ProfileFriendsRoute() {
  const { handle = '' } = useParams()
  return <ProfileFriendsPage handle={handle} />
}

/** `/:handle/members` mirrors `ProfileFriendsRoute` for communities: the full member list
 * reached from `CommunityAside`'s «Все участники» link. */
function CommunityMembersRoute() {
  const { handle = '' } = useParams()
  return <CommunityMembersPage handle={handle} />
}

/**
 * Composes `AppShell` with the PYMK right column here (not inside `AppShell` itself): the
 * block lives in `widgets/pymk-block`, and Steiger's `fsd/forbidden-imports` forbids one
 * widget slice importing another. `app` sits above `widgets`, so it can import both.
 */
function MainShell() {
  const { status } = useSession()
  return <AppShell rightColumn={status === 'authed' ? <PymkBlock compact /> : undefined} />
}

// Every nav destination resolves to a page: the ones without a real implementation yet get a
// placeholder instead of falling through to 404. "Профиль" has no route of its own — its `to`
// is a marker `SideNav` swaps for `/${userHandle(me)}`, resolved at `/:handle` below — and
// "Друзья"/"Сообщества" now have real pages, so all three are excluded here.
const STATIC_DESTINATIONS = new Set(['/feed', '/profile', '/friends', '/communities'])
const comingSoonRoutes = NAV_ITEMS.filter((item) => !STATIC_DESTINATIONS.has(item.to)).map(
  (item) => ({
    path: item.to,
    element: authed(<ComingSoonPage title={item.label} />),
  }),
)

/**
 * Exported separately from `router` (below) so tests can feed the same route tree into
 * `createMemoryRouter`/`matchRoutes` without going through `createBrowserRouter`'s real
 * browser history — see `router.test.tsx`, which checks that `/edit` and `/search` (static)
 * outrank `/:handle` (dynamic) instead of accidentally falling through to `HandleRoute`.
 */
export const routes: RouteObject[] = [
  {
    element: <MainShell />,
    children: [
      { path: '/', element: <Navigate to="/feed" replace /> },
      { path: '/feed', element: authed(<FeedPage />) },
      { path: '/friends', element: authed(<FriendsPage />) },
      { path: '/communities', element: authed(<CommunitiesPage />) },
      { path: '/search', element: authed(<SearchPage />) },
      { path: '/edit', element: authed(<EditProfilePage />) },
      ...comingSoonRoutes,
      { path: '/:handle/friends', element: authed(<ProfileFriendsRoute />) },
      { path: '/:handle/members', element: authed(<CommunityMembersRoute />) },
      { path: '*', element: S(<NotFoundPage />) },
    ],
  },
  // `/:handle` renders its own `AppShell` (see `HandleRoute`): the profile header spans both
  // content columns, so it goes into the shell's `wide` slot, which only a component that has
  // already resolved the handle can fill. Route ranking is unaffected — react-router scores the
  // full path, so `/edit` and `/search` still outrank `/:handle`.
  { path: '/:handle', element: authed(<HandleRoute />) },
  {
    element: <AppShell bare />,
    children: [
      { path: '/login', element: S(<LoginPage />) },
      { path: '/register', element: S(<RegisterPage />) },
    ],
  },
]

export const router = createBrowserRouter(routes)
