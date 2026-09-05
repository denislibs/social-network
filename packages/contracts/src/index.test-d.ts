import { createApi } from './index'

const api = createApi('http://localhost:3000')
async function check() {
  const { data } = await api.api.v1.me.get()
  if (data) {
    const login: string = data.user.login
    // @ts-expect-error unknown field
    data.user.nope
    return login
  }
  const r = await api.api.v1.auth.login.post({ login: 'a', password: 'b' })
  // @ts-expect-error password required
  await api.api.v1.auth.login.post({ login: 'a' })
  return r.data?.user.id
}
void check
