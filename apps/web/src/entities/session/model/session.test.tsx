import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as SharedApi from '@/shared/api'

const { me, logoutPost } = vi.hoisted(() => ({ me: vi.fn(), logoutPost: vi.fn() }))
vi.mock('@/shared/api', async () => {
  const actual = await vi.importActual<typeof SharedApi>('@/shared/api')
  return {
    ...actual,
    api: { api: { v1: { me: { get: me }, auth: { logout: { post: logoutPost } } } } },
  }
})

import { emitUnauthorized } from '@/shared/api'
import { SessionProvider } from './SessionProvider'
import { useSession } from './useSession'

const user = {
  id: 1,
  login: 'demo',
  firstName: 'Демо',
  lastName: 'П',
  screenName: null,
  createdAt: '',
}
function Probe() {
  const s = useSession()
  return (
    <div>
      {s.status}:{s.user?.login ?? '-'}
    </div>
  )
}
let grabbed: ReturnType<typeof useSession> | undefined
function Grab() {
  // Test harness: capture the hook's return value so the test can call
  // `logout()` imperatively outside of render.
  // oxlint-disable-next-line react/globals
  grabbed = useSession()
  return null
}
beforeEach(() => {
  me.mockReset()
  logoutPost.mockReset()
  grabbed = undefined
})

describe('SessionProvider', () => {
  it('becomes authed from /me', async () => {
    me.mockResolvedValue({ data: { user }, error: null })
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    expect(screen.getByText('loading:-')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('authed:demo')).toBeInTheDocument())
  })
  it('becomes guest on 401', async () => {
    me.mockResolvedValue({ data: null, error: { status: 401, value: {} } })
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(screen.getByText('guest:-')).toBeInTheDocument())
  })
  it('logout clears state even if the request fails', async () => {
    me.mockResolvedValue({ data: { user }, error: null })
    logoutPost.mockRejectedValueOnce(new Error('network'))
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <SessionProvider>
        <Probe />
        <Grab />
      </SessionProvider>,
    )
    await waitFor(() => expect(screen.getByText('authed:demo')).toBeInTheDocument())
    await grabbed!.logout()
    await waitFor(() => expect(screen.getByText('guest:-')).toBeInTheDocument())
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })
  it('drops to guest when an unauthorized event fires', async () => {
    me.mockResolvedValue({ data: { user }, error: null })
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    )
    await waitFor(() => expect(screen.getByText('authed:demo')).toBeInTheDocument())
    emitUnauthorized()
    await waitFor(() => expect(screen.getByText('guest:-')).toBeInTheDocument())
  })
})
