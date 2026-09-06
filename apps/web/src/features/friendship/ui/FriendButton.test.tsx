import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { withProviders } from '@/shared/lib'
import { fakeFriendshipGateway, friendshipTestContainer } from '../model/testing'
import { FriendButton } from './FriendButton'

function mount(relation: Parameters<typeof FriendButton>[0]['relation'], overrides = {}) {
  const gateway = fakeFriendshipGateway(overrides)
  const container = friendshipTestContainer(gateway)
  render(<FriendButton userId={1} relation={relation} />, { wrapper: withProviders(container) })
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
})
