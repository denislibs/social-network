import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { Glob } from 'bun'

const root = resolve(import.meta.dir)
const LAYERS = ['domain', 'application', 'infrastructure', 'presentation']
const files = [...new Glob('**/*.ts').scanSync({ cwd: root, absolute: true })].filter(
  (f) => !f.endsWith('.test.ts'),
)

/** Все спецификаторы импортов/реэкспортов файла: `import x from '…'`, многострочные, `export … from '…'`, `import '…'`. */
const specRe = /\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm
export function specsOf(src: string): string[] {
  return [...src.matchAll(specRe)].map((m) => (m[1] ?? m[2]) as string)
}
const isPkg = (spec: string, pkgs: string[]) =>
  pkgs.some((b) => spec === b || spec.startsWith(`${b}/`) || spec.startsWith(`${b}:`))
const hitsPath = (spec: string, parts: string[]) =>
  spec.startsWith('.') && parts.some((b) => `${spec}/`.includes(b))

function moduleOf(file: string): string | null {
  const rel = relative(root, file).split('/')
  return rel.length > 1 ? (rel[0] as string) : null
}
function layerOf(file: string): string | null {
  const rel = relative(root, file).split('/')
  return rel[1] && LAYERS.includes(rel[1]) ? rel[1] : null
}

describe('specsOf', () => {
  it('captures single-line, multi-line, type, side-effect imports and re-exports', () => {
    const src = `import a from './a'\nimport type { B } from '../b'\nimport {\n  c,\n} from 'pkg/c'\nimport 'side'\nexport { d } from './d'\nexport * from '../e'\n`
    expect(specsOf(src)).toEqual(['./a', '../b', 'pkg/c', 'side', './d', '../e'])
  })
})

describe('module boundaries', () => {
  it('no module imports another module inner layers', () => {
    const violations: string[] = []
    for (const f of files) {
      const mod = moduleOf(f)
      if (!mod) continue
      for (const spec of specsOf(readFileSync(f, 'utf8'))) {
        if (!spec.startsWith('.')) continue
        const target = resolve(dirname(f), spec)
        const tmod = moduleOf(target)
        if (tmod && tmod !== mod && layerOf(target))
          violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
  it('domain layer imports no framework/infrastructure', () => {
    const violations: string[] = []
    for (const f of files) {
      if (layerOf(f) !== 'domain') continue
      for (const spec of specsOf(readFileSync(f, 'utf8'))) {
        if (
          isPkg(spec, ['elysia', 'drizzle-orm', 'ioredis', 'bun']) ||
          hitsPath(spec, ['/application/', '/infrastructure/', '/presentation/', '/db/'])
        )
          violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
  it('application layer does not import infrastructure or presentation', () => {
    const violations: string[] = []
    for (const f of files) {
      if (layerOf(f) !== 'application') continue
      for (const spec of specsOf(readFileSync(f, 'utf8'))) {
        if (
          isPkg(spec, ['elysia', 'drizzle-orm', 'ioredis']) ||
          hitsPath(spec, ['/infrastructure/', '/presentation/'])
        )
          violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
})
