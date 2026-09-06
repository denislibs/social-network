import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRoot, ConfigProvider } from '@vkontakte/vkui'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api'
import { withProviders } from '@/shared/lib'
import { fakeFriendshipGateway, friendshipTestContainer } from '../model/testing'
import { FriendButton } from './FriendButton'

function mount(
  relation: Parameters<typeof FriendButton>[0]['relation'],
  overrides = {},
  variant: Parameters<typeof FriendButton>[0]['variant'] = 'button',
) {
  const gateway = fakeFriendshipGateway(overrides)
  const container = friendshipTestContainer(gateway)
  render(<FriendButton userId={1} relation={relation} variant={variant} />, {
    wrapper: withProviders(container),
  })
  return { gateway }
}

/**
 * `Snackbar` is rendered outside any VKUI shell in `mount()` above, which is fine for the
 * other tests here (they never assert on the Snackbar itself). This test does, so it needs
 * the real `ConfigProvider`/`AppRoot` nesting the app uses (see `app/main.tsx`) — local to
 * this file since `shared/lib` is out of scope for this change.
 */
function mountWithVkui(relation: Parameters<typeof FriendButton>[0]['relation'], overrides = {}) {
  const gateway = fakeFriendshipGateway(overrides)
  const container = friendshipTestContainer(gateway)
  const Providers = withProviders(container)
  render(
    <ConfigProvider>
      <AppRoot>
        <Providers>
          <FriendButton userId={1} relation={relation} />
        </Providers>
      </AppRoot>
    </ConfigProvider>,
  )
  return { gateway }
}

describe('FriendButton', () => {
  it('none: shows a single "Добавить в друзья" button', () => {
    mount('none')
    expect(screen.getByRole('button', { name: 'Добавить в друзья' })).toBeInTheDocument()
  })

  it('incoming: shows "Принять" and "Отклонить"', () => {
    mount('incoming')
    expect(screen.getByRole('button', { name: 'Принять' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отклонить' })).toBeInTheDocument()
  })

  it('friends: shows a disabled "У вас в друзьях" and "Удалить из друзей"', () => {
    mount('friends')
    expect(screen.getByRole('button', { name: 'У вас в друзьях' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Удалить из друзей' })).toBeInTheDocument()
  })

  it('outgoing: shows a disabled "Заявка отправлена" and "Отменить заявку"', () => {
    mount('outgoing')
    expect(screen.getByRole('button', { name: 'Заявка отправлена' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Отменить заявку' })).toBeInTheDocument()
  })

  it('self: renders nothing', () => {
    mount('self')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('clicking the primary button calls the gateway', async () => {
    const { gateway } = mount('none', { request: vi.fn().mockResolvedValue('outgoing') })
    await userEvent.click(screen.getByRole('button', { name: 'Добавить в друзья' }))
    expect(gateway.request).toHaveBeenCalledWith(1)
  })

  describe('variant="icon"', () => {
    it('renders a single icon button whose accessible name is the action label', () => {
      mount('none', {}, 'icon')
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
      expect(screen.getByRole('button', { name: 'Добавить в друзья' })).toBeInTheDocument()
    })

    it('drops the secondary action instead of crowding the row', () => {
      mount('friends', {}, 'icon')
      expect(screen.getByRole('button', { name: 'У вас в друзьях' })).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Удалить из друзей' })).not.toBeInTheDocument()
    })

    it('still calls the gateway on click', async () => {
      const { gateway } = mount('none', { request: vi.fn().mockResolvedValue('outgoing') }, 'icon')
      await userEvent.click(screen.getByRole('button', { name: 'Добавить в друзья' }))
      expect(gateway.request).toHaveBeenCalledWith(1)
    })

    it('self: renders nothing', () => {
      mount('self', {}, 'icon')
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  it('shows a Snackbar with the mapped error text when the request fails, and it goes away once closed', async () => {
    mountWithVkui('none', {
      request: vi.fn().mockRejectedValue(new ApiError(409, 'request_cooldown', 'x')),
    })

    await userEvent.click(screen.getByRole('button', { name: 'Добавить в друзья' }))
    expect(await screen.findByText('Заявку можно повторить через сутки')).toBeInTheDocument()

    // Snackbar has no `action` slot here, so the only user-driven close path is Escape
    // (VKUI wires it to `useGlobalEscKeyDown`). jsdom never runs the CSS keyframe animation
    // that normally carries the Snackbar from "exit" to "exited", so the animation events
    // that drive that transition (and, with it, `onClosed`) are dispatched by hand below.
    await userEvent.keyboard('{Escape}')
    const alert = screen.getByRole('alert')
    fireEvent.animationStart(alert)
    fireEvent.animationEnd(alert)

    expect(screen.queryByText('Заявку можно повторить через сутки')).not.toBeInTheDocument()
  })
})
