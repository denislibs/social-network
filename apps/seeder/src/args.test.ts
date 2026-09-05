import { describe, expect, it } from 'bun:test'
import { ArgError, maskDbUrl, parseSeedArgs } from './args'

const env = { DATABASE_URL: 'postgres://vk:vk@localhost:5432/vk' }

describe('parseSeedArgs', () => {
  it('defaults every option and takes the url from the environment', () => {
    expect(parseSeedArgs([], env)).toEqual({
      databaseUrl: 'postgres://vk:vk@localhost:5432/vk',
      scale: 1,
      seed: 42,
      days: 90,
      yes: false,
    })
  })
  it('parses explicit values, --url winning over the environment', () => {
    expect(
      parseSeedArgs(
        ['--scale', '0.01', '--seed', '7', '--days', '30', '--yes', '--url', 'postgres://a@b/c'],
        env,
      ),
    ).toEqual({
      databaseUrl: 'postgres://a@b/c',
      scale: 0.01,
      seed: 7,
      days: 30,
      yes: true,
    })
  })

  // Number('abc') is NaN, which used to sail through into runSeed and TRUNCATE the database.
  it.each([
    ['--scale abc', ['--scale', 'abc']],
    ['--scale 0', ['--scale', '0']],
    ['--scale -1', ['--scale', '-1']],
    ['--scale 3', ['--scale', '3']],
    ['--scale ""', ['--scale', '']],
    ['--seed abc', ['--seed', 'abc']],
    ['--seed 1.5', ['--seed', '1.5']],
    ['--seed -1', ['--seed', '-1']],
    ['--days abc', ['--days', 'abc']],
    ['--days 0', ['--days', '0']],
    ['--days 400', ['--days', '400']],
    ['--days Infinity', ['--days', 'Infinity']],
    ['unknown option', ['--nope']],
  ])('rejects %s', (_label, argv) => {
    expect(() => parseSeedArgs(argv, env)).toThrow(ArgError)
  })

  it('requires a database url when neither --url nor DATABASE_URL is set', () => {
    expect(() => parseSeedArgs([], {})).toThrow(/DATABASE_URL or --url/)
  })
})

describe('maskDbUrl', () => {
  it('masks the password and leaves the rest readable', () => {
    expect(maskDbUrl('postgres://vk:s3cret@localhost:5432/vk')).toBe(
      'postgres://vk:***@localhost:5432/vk',
    )
  })
  it('leaves a url without a password alone', () => {
    expect(maskDbUrl('postgres://localhost:5432/vk')).toBe('postgres://localhost:5432/vk')
  })
})
