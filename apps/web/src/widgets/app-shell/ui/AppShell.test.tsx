import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { createTestContainer, withDi } from '@/shared/di'
import {
  COLOR_SCHEME_STORE,
  ColorSchemeStore,
  fakeSystemScheme,
  memPrefStorage,
} from '@/shared/lib'

vi.mock('@/entities/session', () => ({
  useSession: () => ({
    user: {
      id: 1,
      login: 'demo',
      firstName: 'Демо',
      lastName: 'П',
      screenName: null,
      createdAt: '',
    },
    status: 'authed',
    setUser: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  }),
}))

import { AppShell } from './AppShell'

function mount(path: string, bare = false) {
  const container = createTestContainer()
  container
    .bind(COLOR_SCHEME_STORE)
    .toConstantValue(new ColorSchemeStore(memPrefStorage(null), fakeSystemScheme(false).system))
  const router = createMemoryRouter(
    [
      {
        element: <AppShell bare={bare} />,
        children: [
          { path: '/feed', element: <div>FEED</div> },
          { path: '/im', element: <div>IM</div> },
          { path: '/login', element: <div>LOGIN</div> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />, { wrapper: withDi(container) })
}

describe('AppShell', () => {
  it('renders seven nav items and marks the current one', () => {
    mount('/feed')
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' })
    expect(nav.querySelectorAll('a')).toHaveLength(7)
    expect(screen.getByRole('link', { name: /Лента/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Мессенджер/ })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toHaveTextContent('FEED')
  })

  it('bare mode hides navigation but keeps main', () => {
    mount('/login', true)
    expect(screen.queryByRole('navigation', { name: 'Основная навигация' })).toBeNull()
    expect(screen.getByRole('main')).toHaveTextContent('LOGIN')
  })

  it('header shows logout for an authed user', () => {
    mount('/feed')
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })
})
