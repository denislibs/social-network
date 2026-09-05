import { render, waitFor } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const me = vi.hoisted(() => vi.fn())
vi.mock('~/shared/api/client', () => ({
  api: {
    api: {
      v1: {
        me: { get: me },
        auth: { logout: { post: vi.fn(async () => ({ data: null, error: null })) } },
      },
    },
  },
  unwrap: (r: { data: unknown; error: { status: number } | null }) => {
    if (r.error) throw Object.assign(new Error('x'), { status: r.error.status })
    return r.data
  },
}))

import { SessionProvider, useSession } from './session'

function Probe() {
  const s = useSession()
  return (
    <div>
      {s.status()}:{s.user()?.login ?? '-'}
    </div>
  )
}
beforeEach(() => me.mockReset())

describe('SessionProvider', () => {
  it('resolves to authed with user from /me', async () => {
    me.mockResolvedValue({
      data: {
        user: {
          id: 1,
          login: 'demo',
          firstName: 'Д',
          lastName: 'П',
          screenName: null,
          createdAt: '',
        },
      },
      error: null,
    })
    const { getByText } = render(() => (
      <SessionProvider>
        <Probe />
      </SessionProvider>
    ))
    expect(getByText('loading:-')).toBeInTheDocument()
    await waitFor(() => expect(getByText('authed:demo')).toBeInTheDocument())
  })
  it('resolves to guest on 401', async () => {
    me.mockResolvedValue({ data: null, error: { status: 401, value: {} } })
    const { getByText } = render(() => (
      <SessionProvider>
        <Probe />
      </SessionProvider>
    ))
    await waitFor(() => expect(getByText('guest:-')).toBeInTheDocument())
  })
})
