import { parseArgs } from 'node:util'

export type SeedArgs = {
  databaseUrl: string
  seed: number
  scale: number
  days: number
  yes: boolean
}

/** Thrown for anything the user can fix by retyping the command; the CLI prints it and exits 2. */
export class ArgError extends Error {}

const num = (raw: string, name: string): number => {
  const n = Number(raw)
  if (raw.trim() === '' || !Number.isFinite(n))
    throw new ArgError(`--${name} must be a number, got ${JSON.stringify(raw)}`)
  return n
}
const int = (raw: string, name: string): number => {
  const n = num(raw, name)
  if (!Number.isInteger(n)) throw new ArgError(`--${name} must be a whole number, got ${raw}`)
  return n
}
const inRange = (n: number, name: string, lo: number, hi: number): number => {
  if (n < lo || n > hi) throw new ArgError(`--${name} must be between ${lo} and ${hi}, got ${n}`)
  return n
}

/**
 * Parses and validates the seeder CLI arguments. Pure: it never touches the database or the
 * environment beyond `env`, so the whole validation surface is unit-testable — which matters
 * because the seed TRUNCATEs every table it touches and `Number('abc')` is NaN, not an error.
 */
export function parseSeedArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): SeedArgs {
  let values: {
    scale?: string
    seed?: string
    days?: string
    yes?: boolean
    url?: string
  }
  try {
    ;({ values } = parseArgs({
      args: argv,
      options: {
        scale: { type: 'string', default: '1' },
        seed: { type: 'string', default: '42' },
        days: { type: 'string', default: '90' },
        yes: { type: 'boolean', default: false },
        url: { type: 'string' },
      },
    }))
  } catch (e) {
    throw new ArgError(e instanceof Error ? e.message : String(e))
  }

  const databaseUrl = values.url ?? env.DATABASE_URL
  if (!databaseUrl) throw new ArgError('DATABASE_URL or --url is required')

  // scale > 0 keeps the generators from producing an empty population; the upper bound is a
  // guard rail — scale 2 is already ~100k users and several million events.
  const scale = num(values.scale as string, 'scale')
  if (scale <= 0 || scale > 2)
    throw new ArgError(`--scale must be greater than 0 and at most 2, got ${scale}`)

  return {
    databaseUrl,
    scale,
    seed: inRange(int(values.seed as string, 'seed'), 'seed', 0, Number.MAX_SAFE_INTEGER),
    days: inRange(int(values.days as string, 'days'), 'days', 1, 365),
    yes: values.yes === true,
  }
}

/** `postgres://user:***@host/db` — the confirmation prompt must not echo the password. */
export function maskDbUrl(url: string): string {
  return url.replace(/(:\/\/[^:/@]+:)[^@]*@/, '$1***@')
}
