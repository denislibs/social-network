import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/shared/config'

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

// ---------------------------------------------------------------------------
// Pure rule helpers — kept free of file-system access so they can be unit
// tested directly against fixtures below, independent of the repo's current
// contents.
// ---------------------------------------------------------------------------

const HEX_OR_FUNC_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/
const FONT_SIZING = /(font-?size|font-?family|font-?weight|line-?height)\s*[:=]/i
// Requires a literal `:` right after the property name (optionally through an
// opening quote) so it doesn't trip on VKUI prop names like `colorScheme=` or
// `gradientColor={1}`, and excludes values that reference a VKUI CSS variable.
const INLINE_COLOR_DECLARATION =
  /\b(color|background(?:-?color)?|border-?color)\s*:\s*['"]?(?!var\(--vkui--)[a-z#]/i

function hasRawColorOrTypography(src: string): boolean {
  return HEX_OR_FUNC_COLOR.test(src) || FONT_SIZING.test(src) || INLINE_COLOR_DECLARATION.test(src)
}

const RAW_TAG = /<(button|input|select|textarea|a|img)[\s>]/
function hasRawInteractiveOrMediaTag(src: string): boolean {
  return RAW_TAG.test(src)
}

const DANGEROUS_HTML = /dangerouslySetInnerHTML/
function hasDangerousHtml(src: string): boolean {
  return DANGEROUS_HTML.test(src)
}

const STRING_CREATE_ELEMENT = /createElement\(\s*['"][a-z]/
function hasStringCreateElement(src: string): boolean {
  return STRING_CREATE_ELEMENT.test(src)
}

function stripCssComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Returns the contents of every `{ ... }` block, discarding the selector text before `{`. */
function extractDeclarationBlocks(src: string): string[] {
  const blocks: string[] = []
  const re = /\{([^{}]*)\}/g
  let m: RegExpExecArray | null = re.exec(src)
  while (m) {
    blocks.push(m[1] ?? '')
    m = re.exec(src)
  }
  return blocks
}

function declarationsOf(block: string): string[] {
  return block
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.includes(':') && !s.startsWith('@'))
}

function isAllowedDeclaration(decl: string): boolean {
  const [prop, ...rest] = decl.split(':')
  const value = rest.join(':')
  return ALLOWED_CSS_PROPS.test((prop ?? '').trim()) || /var\(--vkui--/.test(value)
}

function badCssDeclarations(src: string): string[] {
  const bad: string[] = []
  for (const block of extractDeclarationBlocks(stripCssComments(src))) {
    for (const decl of declarationsOf(block)) {
      if (!isAllowedDeclaration(decl)) bad.push(decl)
    }
  }
  return bad
}

describe('VKUI-only policy: pure rule helpers (fixtures)', () => {
  it('good CSS with a pseudo-class selector passes', () => {
    const css = '.foo:hover { color: var(--vkui--color_text_primary); gap: 8px; }'
    expect(badCssDeclarations(css)).toEqual([])
  })

  it('a raw hex declaration fails', () => {
    expect(isAllowedDeclaration('color:#fff')).toBe(false)
  })

  it('a raw hex literal fails the color/typography scan', () => {
    expect(hasRawColorOrTypography('color:#fff')).toBe(true)
  })

  it('a JSX inline style color fails the color/typography scan', () => {
    expect(hasRawColorOrTypography("style={{color:'tomato'}}")).toBe(true)
  })

  it('the gradientColor VKUI prop does not false-positive', () => {
    expect(hasRawColorOrTypography('gradientColor={1}')).toBe(false)
  })

  it('the colorScheme VKUI prop does not false-positive', () => {
    expect(hasRawColorOrTypography('colorScheme={scheme}')).toBe(false)
  })

  it('a VKUI css variable value does not false-positive', () => {
    expect(hasRawColorOrTypography("background: 'var(--vkui--color_background)'")).toBe(false)
  })

  it('font-weight and line-height are caught alongside font-size/font-family', () => {
    expect(hasRawColorOrTypography('font-weight: 700')).toBe(true)
    expect(hasRawColorOrTypography('line-height: 1.4')).toBe(true)
  })

  it('detects dangerouslySetInnerHTML', () => {
    expect(hasDangerousHtml('<div dangerouslySetInnerHTML={{ __html: x }} />')).toBe(true)
    expect(hasDangerousHtml('<div>safe</div>')).toBe(false)
  })

  it('detects createElement with a quoted lowercase tag', () => {
    expect(hasStringCreateElement("createElement('div')")).toBe(true)
    expect(hasStringCreateElement('createElement(MyComponent)')).toBe(false)
  })

  it('detects raw interactive and media tags, including img', () => {
    for (const tag of ['button', 'input', 'select', 'textarea', 'a', 'img']) {
      expect(hasRawInteractiveOrMediaTag(`<${tag} />`)).toBe(true)
    }
    expect(hasRawInteractiveOrMediaTag('<Avatar />')).toBe(false)
  })
})

describe('VKUI-only policy', () => {
  it('no raw colors or typography sizing in src', () => {
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      if (hasRawColorOrTypography(src)) bad.push(relative(ROOT, f))
    }
    expect(bad).toEqual([])
  })

  it('no raw interactive/media elements in tsx (use VKUI Button/Input/Link/IconButton/Image)', () => {
    const bad: string[] = []
    for (const f of files.filter((p) => p.endsWith('.tsx'))) {
      const src = readFileSync(f, 'utf8')
      if (hasRawInteractiveOrMediaTag(src)) bad.push(relative(ROOT, f))
    }
    expect(bad).toEqual([])
  })

  it('no dangerouslySetInnerHTML', () => {
    const bad = files
      .filter((f) => hasDangerousHtml(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f))
    expect(bad).toEqual([])
  })

  it('no createElement with a string tag (bypasses VKUI components)', () => {
    const bad = files
      .filter((f) => hasStringCreateElement(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f))
    expect(bad).toEqual([])
  })

  it('css modules only declare layout properties or vkui variables', () => {
    const bad: string[] = []
    for (const f of files.filter((p) => p.endsWith('.css') && !p.endsWith('global.css'))) {
      const src = readFileSync(f, 'utf8')
      for (const decl of badCssDeclarations(src)) bad.push(`${relative(ROOT, f)}: ${decl}`)
    }
    expect(bad).toEqual([])
  })

  it('never imports the removed ui-kit or solid', () => {
    const bad = files
      .filter((f) => /from ['"](@vkc\/ui-kit|solid-js)/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f))
    expect(bad).toEqual([])
  })

  it('the anti-FOUC inline script in index.html reads the same storage key as the store', () => {
    const html = readFileSync(join(ROOT, '..', 'index.html'), 'utf8')
    expect(html).toContain(`'${STORAGE_KEYS.colorScheme}'`)
  })
})
