import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { cookieFrom, createTestApp, type TestApp } from '../../../../test/helpers/app'
import { truncateAll } from '../../../../test/helpers/db'

let t: TestApp
beforeAll(async () => {
  t = await createTestApp()
})
beforeEach(async () => {
  await truncateAll(t.db)
  await t.redis.flushdb()
})
afterAll(async () => {
  await t.close()
})

const json = (path: string, body: unknown, cookie?: string) =>
  t.app.handle(
    new Request(`http://localhost/api/v1${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  )
const get = (path: string, cookie?: string) =>
  t.app.handle(new Request(`http://localhost/api/v1${path}`, { headers: cookie ? { cookie } : {} }))
const creds = {
  login: 'denis',
  password: 'password123',
  firstName: 'Денис',
  lastName: 'Кораблев',
}

describe('auth e2e', () => {
  it('register sets httpOnly sid cookie and returns user', async () => {
    const res = await json('/auth/register', creds)
    expect(res.status).toBe(201)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/^sid=[a-f0-9]{64};/)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('Max-Age=2592000')
    expect(await res.json()).toMatchObject({ user: { login: 'denis', firstName: 'Денис' } })
  })
  it('validation: short password → 422 with domain code, bad body → 422', async () => {
    expect((await json('/auth/register', { ...creds, password: '123' })).status).toBe(422)
    expect(await (await json('/auth/register', { ...creds, password: '123' })).json()).toEqual({
      error: { code: 'weak_password', message: 'Password must be at least 8 characters' },
    })
    expect((await json('/auth/register', { login: 'x' })).status).toBe(422)
  })
  it('duplicate login → 409', async () => {
    await json('/auth/register', creds)
    const res = await json('/auth/register', creds)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: { code: 'login_taken', message: 'Login is already taken' },
    })
  })
  it('me requires cookie; login → me → logout → me 401', async () => {
    await json('/auth/register', creds)
    expect((await get('/me')).status).toBe(401)
    const login = await json('/auth/login', { login: 'DENIS', password: 'password123' })
    expect(login.status).toBe(200)
    const cookie = cookieFrom(login)
    const me = await get('/me', cookie)
    expect(me.status).toBe(200)
    expect(await me.json()).toMatchObject({ user: { login: 'denis' } })
    const out = await json('/auth/logout', {}, cookie)
    expect(out.status).toBe(204)
    expect(out.headers.get('set-cookie')).toMatch(/^sid=;/)
    expect((await get('/me', cookie)).status).toBe(401)
  })
  it('wrong password → 401 invalid_credentials', async () => {
    await json('/auth/register', creds)
    const res = await json('/auth/login', { login: 'denis', password: 'nope' })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({
      error: { code: 'invalid_credentials', message: 'Wrong login or password' },
    })
  })
  it('logout-all kills every session', async () => {
    const a = cookieFrom(await json('/auth/register', creds))
    const b = cookieFrom(await json('/auth/login', { login: 'denis', password: 'password123' }))
    expect((await json('/auth/logout-all', {}, a)).status).toBe(204)
    expect((await get('/me', a)).status).toBe(401)
    expect((await get('/me', b)).status).toBe(401)
  })
})
