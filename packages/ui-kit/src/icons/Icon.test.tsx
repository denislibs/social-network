import { render } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'
import { configureIcons } from './icons.config'

describe('Icon', () => {
  it('renders <use> pointing at configured sprite url + name', () => {
    configureIcons({ spriteUrl: '/assets/sprite.svg' })
    const { container } = render(() => <Icon name="like_outline_24" />)
    const use = container.querySelector('use')
    expect(use?.getAttribute('href')).toBe('/assets/sprite.svg#like_outline_24')
  })
  it('derives size from name suffix, allows override', () => {
    const a = render(() => <Icon name="home_outline_28" />).container.querySelector('svg')!
    expect(a.getAttribute('width')).toBe('28')
    const b = render(() => <Icon name="home_outline_28" size={20} />).container.querySelector(
      'svg',
    )!
    expect(b.getAttribute('width')).toBe('20')
  })
  it('is aria-hidden without label and labelled otherwise', () => {
    const a = render(() => <Icon name="like_outline_24" />).container.querySelector('svg')!
    expect(a.getAttribute('aria-hidden')).toBe('true')
    const b = render(() => (
      <Icon name="like_outline_24" label="Нравится" />
    )).container.querySelector('svg')!
    expect(b.getAttribute('role')).toBe('img')
    expect(b.getAttribute('aria-label')).toBe('Нравится')
  })
})
