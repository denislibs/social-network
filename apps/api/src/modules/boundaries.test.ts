import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { Glob } from 'bun'

const root = resolve(import.meta.dir)
const files = [...new Glob('**/*.ts').scanSync({ cwd: root, absolute: true })].filter(
  (f) => !f.endsWith('.test.ts'),
)
const importRe = /^\s*import\s[^'"]*['"]([^'"]+)['"]/gm

function moduleOf(file: string): string | null {
  const rel = relative(root, file).split('/')
  // biome-ignore lint/style/noNonNullAssertion: This is safe because we check length > 1
  return rel.length > 1 ? rel[0]! : null
}
function layerOf(file: string): string | null {
  const rel = relative(root, file).split('/')
  return rel[1] && ['domain', 'application', 'infrastructure', 'presentation'].includes(rel[1])
    ? rel[1]
    : null
}

describe('module boundaries', () => {
  it('no module imports another module inner layers', () => {
    const violations: string[] = []
    for (const f of files) {
      const mod = moduleOf(f)
      if (!mod) continue
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(importRe)) {
        // biome-ignore lint/style/noNonNullAssertion: RegExp.matchAll ensures match[1] exists
        const spec = m[1]!
        if (!spec.startsWith('.')) continue
        const target = resolve(dirname(f), spec)
        const tmod = moduleOf(target)
        const tlayer = layerOf(target)
        if (tmod && tmod !== mod && tlayer) violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
  it('domain layer imports no framework/infrastructure', () => {
    const banned = [
      'elysia',
      'drizzle-orm',
      'ioredis',
      'bun',
      'bun:',
      '../application',
      '../infrastructure',
      '../presentation',
      '/db/',
    ]
    const violations: string[] = []
    for (const f of files) {
      if (layerOf(f) !== 'domain') continue
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(importRe)) {
        // biome-ignore lint/style/noNonNullAssertion: RegExp.matchAll ensures match[1] exists
        const spec = m[1]!
        if (banned.some((b) => spec === b || spec.startsWith(b) || spec.includes(b)))
          violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
  it('application layer does not import infrastructure or presentation', () => {
    const violations: string[] = []
    for (const f of files) {
      if (layerOf(f) !== 'application') continue
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(importRe)) {
        // biome-ignore lint/style/noNonNullAssertion: RegExp.matchAll ensures match[1] exists
        const spec = m[1]!
        if (
          /\/(infrastructure|presentation)\//.test(spec) ||
          spec.includes('../infrastructure') ||
          spec.includes('../presentation') ||
          ['elysia', 'drizzle-orm', 'ioredis'].some((b) => spec.startsWith(b))
        )
          violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
})
