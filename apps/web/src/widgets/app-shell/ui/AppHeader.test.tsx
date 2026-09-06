import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { fakeNotificationGateway, NOTIFICATION_GATEWAY } from '@/entities/notification'
import { createSessionTestProvider } from '@/entities/session'
import { createTestContainer } from '@/shared/di'
import {
  COLOR_SCHEME_STORE,
  ColorSchemeStore,
  fakeSystemScheme,
  fakeTabCoordinator,
  memPrefStorage,
  TAB_COORDINATOR,
  withProviders,
} from '@/shared/lib'
import { AppHeader } from './AppHeader'

function mount(bare: boolean, status: 'authed' | 'guest') {
  const container = createTestContainer()
  container.bind(NOTIFICATION_GATEWAY).toConstantValue(fakeNotificationGateway())
  container.bind(TAB_COORDINATOR).toConstantValue(fakeTabCoordinator())
  container
    .bind(COLOR_SCHEME_STORE)
    .toConstantValue(new ColorSchemeStore(memPrefStorage(null), fakeSystemScheme(false).system))
  const Session = createSessionTestProvider({
    status,
    user:
      status === 'authed'
        ? {
            id: 1,
            login: 'demo',
            firstName: 'Демо',
            lastName: 'П',
            screenName: null,
            createdAt: '',
          }
        : null,
  })
  const router = createMemoryRouter([{ path: '/', element: <AppHeader bare={bare} /> }])
  const Providers = withProviders(container)
  render(
    <Session>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </Session>,
  )
}

describe('AppHeader', () => {
  it('shows the notification bell when authed and not bare', () => {
    mount(false, 'authed')
    expect(screen.getByRole('button', { name: 'Уведомления' })).toBeInTheDocument()
  })

  it('hides the notification bell for a guest', () => {
    mount(false, 'guest')
    expect(screen.queryByRole('button', { name: 'Уведомления' })).not.toBeInTheDocument()
  })

  it('hides the notification bell in bare mode, even authed', () => {
    mount(true, 'authed')
    expect(screen.queryByRole('button', { name: 'Уведомления' })).not.toBeInTheDocument()
  })
})
