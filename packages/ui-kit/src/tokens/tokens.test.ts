import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')
const typo = readFileSync(resolve(__dirname, 'typography.css'), 'utf8')

const REQUIRED = [
  'background',
  'background_content',
  'background_secondary',
  'background_tertiary',
  'background_modal',
  'header_background',
  'field_background',
  'search_field_background',
  'background_accent',
  'background_accent_themed',
  'background_secondary_alpha',
  'image_placeholder',
  'text_primary',
  'text_secondary',
  'text_subhead',
  'text_tertiary',
  'text_link',
  'text_accent',
  'text_contrast',
  'text_contrast_themed',
  'icon_primary',
  'icon_medium',
  'icon_secondary',
  'icon_tertiary',
  'icon_accent',
  'separator_primary',
  'separator_secondary',
  'skeleton_from',
  'skeleton_to',
  'overlay_primary',
  'background_positive',
  'background_negative',
  'background_positive_tint',
  'background_negative_tint',
  'background_warning',
  'background_info_tint',
  'text_positive',
  'text_negative',
  'icon_warning',
  'track_background',
  'accent_azure',
  'accent_blue',
  'accent_violet',
  'accent_purple',
  'accent_raspberry_pink',
  'accent_pink',
  'accent_red',
  'accent_orange_fire',
  'accent_orange',
  'accent_orange_peach',
  'accent_lime',
  'accent_green',
  'accent_cyan',
  'accent_gray',
  'state_hover',
  'state_active',
]
const ROLES = [
  'title1',
  'display_title1',
  'display_title2',
  'title2',
  'display_title3',
  'title3',
  'display_title4',
  'headline1',
  'headline',
  'text',
  'headline2',
  'paragraph',
  'subhead',
  'footnote',
  'footnote_caps',
  'caption1',
  'caption1_caps',
  'caption2',
  'caption2_caps',
  'caption3',
  'caption3_caps',
]

function block(selector: string): string {
  const i = css.indexOf(selector)
  expect(i, `selector ${selector} present`).toBeGreaterThan(-1)
  const start = css.indexOf('{', i)
  let depth = 0
  for (let j = start; j < css.length; j++) {
    if (css[j] === '{') depth++
    if (css[j] === '}') depth--
    if (depth === 0) return css.slice(start, j)
  }
  throw new Error('unbalanced')
}

describe('tokens.css', () => {
  const light = block(':root {')
  const dark = block(':root[data-vk="dark"]')
  const darkMedia = block(':root:not([data-vk="light"])')
  it.each(REQUIRED)('defines --vk-%s in light, dark and media-dark', (name) => {
    expect(light).toContain(`--vk-${name}:`)
    expect(dark).toContain(`--vk-${name}:`)
    expect(darkMedia).toContain(`--vk-${name}:`)
  })
  it('light and dark differ for background', () => {
    expect(light).toContain('--vk-background: #edeef0')
    expect(dark).toContain('--vk-background: #141414')
  })
  it('defines radii, elevations, motion', () => {
    for (const v of [
      '--vk-radius: 8px',
      '--vk-radius-paper: 12px',
      '--vk-radius-rounded: 48px',
      '--vk-elevation-1',
      '--vk-elevation-4',
      '--vk-duration-s: 100ms',
      '--vk-duration-m: 200ms',
      '--vk-duration-l: 300ms',
      '--vk-ease-default: cubic-bezier(0.3, 0.3, 0.5, 1)',
      '--vk-ease-platform: cubic-bezier(0.4, 0, 0.2, 1)',
      '--vk-font-family:',
    ])
      expect(light).toContain(v)
  })
})

describe('typography.css', () => {
  it.each(ROLES)('has class .vk-%s', (role) => {
    expect(typo).toContain(`.vk-${role} {`)
  })
  it('title1 is 600 24/28', () => {
    expect(typo).toMatch(/\.vk-title1 \{\s*font: 600 24px\/28px var\(--vk-font-family\)/)
  })
})
