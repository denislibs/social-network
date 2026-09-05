import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'

vi.mock('~/shared/session/session', () => ({
  useSession: () => ({
    user: () => ({
      id: 1,
      login: 'demo',
      firstName: 'Демо',
      lastName: 'Пользователь',
      screenName: null,
      createdAt: '',
    }),
    status: () => 'authed',
    setUser: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  }),
}))

import { Layout } from './Layout'

function mount(path: string) {
  const history = createMemoryHistory()
  history.set({ value: path })
  return render(() => (
    <MemoryRouter history={history} root={(p) => <Layout>{p.children}</Layout>}>
      <Route path="/feed" component={() => <div>FEED</div>} />
      <Route path="/im" component={() => <div>IM</div>} />
    </MemoryRouter>
  ))
}

describe('Layout', () => {
  it('renders nav with six items and marks current', () => {
    const { getAllByRole, getByRole } = mount('/feed')
    const nav = getByRole('navigation')
    expect(nav.querySelectorAll('a').length).toBeGreaterThanOrEqual(6)
    expect(getByRole('link', { name: /Лента/ })).toHaveAttribute('aria-current', 'page')
    expect(getByRole('link', { name: /Мессенджер/ })).not.toHaveAttribute('aria-current')
    expect(getAllByRole('main')).toHaveLength(1)
  })

  it('marks exactly one element as the current page', () => {
    for (const path of ['/feed', '/im']) {
      const { container, unmount } = mount(path)
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
      unmount()
    }
  })

  it('renders page content in main', () => {
    const { getByRole } = mount('/im')
    expect(getByRole('main')).toHaveTextContent('IM')
  })
})
