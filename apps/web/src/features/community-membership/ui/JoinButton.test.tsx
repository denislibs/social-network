import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoot, ConfigProvider } from '@vkontakte/vkui'
import { describe, expect, it, vi } from 'vitest'
import { COMMUNITY_GATEWAY, type CommunityDto, type CommunityGateway } from '@/entities/community'
import { ApiError } from '@/shared/api'
import { createTestContainer } from '@/shared/di'
import { withProviders } from '@/shared/lib'
import { JoinButton } from './JoinButton'

const community: CommunityDto = {
  id: 10,
  screenName: 'itclub',
  name: 'IT Club',
  description: null,
  topic: 'it',
  isVerified: false,
  membersCount: 5,
  membership: 'none',
  isFollowing: false,
}

function fakeGateway(overrides: Partial<CommunityGateway> = {}): CommunityGateway {
  return {
    get: vi.fn(),
    members: vi.fn(),
    mine: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    ...overrides,
  }
}

function mount(c: CommunityDto, overrides: Partial<CommunityGateway> = {}) {
  const gateway = fakeGateway(overrides)
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(gateway)
  render(<JoinButton community={c} />, { wrapper: withProviders(container) })
  return { gateway }
}

/**
 * `Snackbar` is rendered outside any VKUI shell in `mount()` above, which is fine for the
 * other tests here (they never assert on the Snackbar itself). This test does, so it needs
 * the real `ConfigProvider`/`AppRoot` nesting the app uses (see `app/main.tsx`) — local to
 * this file since `shared/lib` is out of scope for this change.
 */
function mountWithVkui(c: CommunityDto, overrides: Partial<CommunityGateway> = {}) {
  const gateway = fakeGateway(overrides)
  const container = createTestContainer()
  container.bind(COMMUNITY_GATEWAY).toConstantValue(gateway)
  const Providers = withProviders(container)
  render(
    <ConfigProvider>
      <AppRoot>
        <Providers>
          <JoinButton community={c} />
        </Providers>
      </AppRoot>
    </ConfigProvider>,
  )
  return { gateway }
}

describe('JoinButton', () => {
  it('none: shows a single "Вступить" button and joins on click', async () => {
    const { gateway } = mount(community, {
      join: vi.fn().mockResolvedValue({ membership: 'member', isFollowing: true }),
    })
    await userEvent.click(screen.getByRole('button', { name: 'Вступить' }))
    expect(gateway.join).toHaveBeenCalledWith(10)
  })

  it('member: shows "Вы участник" and "Выйти"', () => {
    mount({ ...community, membership: 'member', isFollowing: true })
    expect(screen.getByRole('button', { name: 'Вы участник' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })

  it('shows a Snackbar with the mapped error text when leaving fails, and it goes away once closed', async () => {
    const admin = { ...community, membership: 'admin' as const, isFollowing: true }
    mountWithVkui(admin, {
      leave: vi.fn().mockRejectedValue(new ApiError(409, 'last_admin', 'x')),
    })

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))
    expect(
      await screen.findByText('Назначьте другого администратора перед выходом'),
    ).toBeInTheDocument()

    // Snackbar has no `action` slot here, so the only user-driven close path is Escape
    // (VKUI wires it to `useGlobalEscKeyDown`). jsdom never runs the CSS keyframe animation
    // that normally carries the Snackbar from "exit" to "exited", so the animation events
    // that drive that transition (and, with it, `onClosed`) are dispatched by hand below.
    await userEvent.keyboard('{Escape}')
    const alert = screen.getByRole('alert')
    fireEvent.animationStart(alert)
    fireEvent.animationEnd(alert)

    expect(
      screen.queryByText('Назначьте другого администратора перед выходом'),
    ).not.toBeInTheDocument()
  })
})
