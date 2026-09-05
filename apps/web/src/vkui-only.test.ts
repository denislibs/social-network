import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname)

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.(tsx?)$/.test(name)) out.push(p)
  }
  return out
}

const files = walk(ROOT)

const ALLOWED_CSS_PROPS =
  /^(display|grid(-[a-z-]+)?|flex(-[a-z-]+)?|gap|row-gap|column-gap|width|height|min-width|min-height|max-width|max-height|padding(-[a-z]+)?|margin(-[a-z]+)?|overflow(-[xy])?|position|inset|top|left|right|bottom|z-index|align-[a-z]+|justify-[a-z]+|place-[a-z]+|order|box-sizing|pointer-events|cursor|visibility|transition|transform)$/

describe('VKUI-only policy', () => {
  it('no raw colors or typography sizing in src', () => {
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|font-size\s*:|font-family\s*:/.test(src))
        bad.push(relative(ROOT, f))
    }
    expect(bad).toEqual([])
  })

  it('no raw interactive elements in tsx (use VKUI Button/Input/Link/IconButton)', () => {
    const bad: string[] = []
    for (const f of files.filter((p) => p.endsWith('.tsx') && !p.includes('/shared/ui/'))) {
      const src = readFileSync(f, 'utf8')
      if (/<(button|input|select|textarea|a)[\s>]/.test(src)) bad.push(relative(ROOT, f))
    }
    expect(bad).toEqual([])
  })

  it('css modules only declare layout properties or vkui variables', () => {
    const bad: string[] = []
    for (const f of files.filter((p) => p.endsWith('.css') && !p.endsWith('global.css'))) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      for (const decl of src
        .split(/[{};]/)
        .map((s) => s.trim())
        .filter((s) => s.includes(':') && !s.startsWith('@'))) {
        const [prop, ...rest] = decl.split(':')
        const value = rest.join(':')
        if (!ALLOWED_CSS_PROPS.test(prop!.trim()) && !/var\(--vkui--/.test(value))
          bad.push(`${relative(ROOT, f)}: ${decl}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('never imports the removed ui-kit or solid', () => {
    const bad = files
      .filter((f) => /from ['"](@vkc\/ui-kit|solid-js)/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f))
    expect(bad).toEqual([])
  })
})
