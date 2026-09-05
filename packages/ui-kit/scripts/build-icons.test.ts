import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildSprite } from './build-icons'

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'icons-'))
  mkdirSync(join(root, '24'))
  mkdirSync(join(root, '28'))
  writeFileSync(
    join(root, '24', 'like_outline_24.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1h2"/></svg>',
  )
  writeFileSync(
    join(root, '28', 'logo_28.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 28 28"><defs><clipPath id="a"><rect width="28" height="28"/></clipPath></defs><g clip-path="url(#a)"><path fill="#fff" d="M0 0h1"/></g></svg>',
  )
  return root
}

describe('buildSprite', () => {
  const { sprite, names } = buildSprite(fixture())
  it('collects names sorted', () => {
    expect(names).toEqual(['like_outline_24', 'logo_28'])
  })
  it('wraps each icon in <symbol id=name viewBox=...> keeping fill', () => {
    expect(sprite).toContain(
      '<symbol id="like_outline_24" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1h2"/></symbol>',
    )
    const symbolsOnly = sprite.slice(sprite.indexOf('<symbol'))
    expect(symbolsOnly).not.toContain('width="24"')
    expect(symbolsOnly).not.toContain('xmlns=')
  })
  it('namespaces inner ids and url() references', () => {
    expect(sprite).toContain('id="logo_28-a"')
    expect(sprite).toContain('clip-path="url(#logo_28-a)"')
    expect(sprite).not.toContain('id="a"')
  })
  it('is a single hidden svg root', () => {
    expect(sprite.startsWith('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">')).toBe(
      true,
    )
    expect(sprite.endsWith('</svg>\n')).toBe(true)
  })
})
