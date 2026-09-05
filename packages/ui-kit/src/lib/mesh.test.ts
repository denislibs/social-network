import { describe, expect, it } from 'vitest'
import { meshGradient, paletteFor } from './mesh'

describe('meshGradient', () => {
  it('is deterministic for the same seed', () => {
    expect(meshGradient(42)).toBe(meshGradient(42))
    expect(meshGradient('deniscoreablev')).toBe(meshGradient('deniscoreablev'))
  })
  it('differs across seeds', () => {
    expect(meshGradient(1)).not.toBe(meshGradient(2))
  })
  it('emits n*n radial layers plus a base linear layer', () => {
    const css = meshGradient(7, 2)
    expect(css.match(/radial-gradient/g)?.length).toBe(4)
    expect(css.match(/linear-gradient/g)?.length).toBe(1)
  })
  it('palette colours are 6-digit hex', () => {
    for (const c of paletteFor(99, 9)) expect(c).toMatch(/^#[0-9a-f]{6}$/)
  })
})
