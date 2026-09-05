import { render } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders img when src given', () => {
    const { getByRole } = render(() => <Avatar src="/a.jpg" alt="Денис" />)
    expect(getByRole('img')).toHaveAttribute('src', '/a.jpg')
  })
  it('renders mesh gradient from seed when no src', () => {
    const { container } = render(() => <Avatar seed={5} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.backgroundImage).toContain('radial-gradient')
    expect(root.querySelector('img')).toBeNull()
  })
  it('sets size and online dot', () => {
    const { container } = render(() => <Avatar seed={1} size={96} online />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.width).toBe('96px')
    expect(root.querySelector('[data-online]')).not.toBeNull()
  })
  it('gradient avatar is labelled when alt given and hidden otherwise', () => {
    const named = render(() => <Avatar seed={2} alt="Денис" />).container.firstElementChild!
    expect(named).toHaveAttribute('role', 'img')
    expect(named).toHaveAttribute('aria-label', 'Денис')
    const anon = render(() => <Avatar seed={3} />).container.firstElementChild!
    expect(anon).toHaveAttribute('aria-hidden', 'true')
  })
})
