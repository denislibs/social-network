import { api, unwrap } from '~/shared/api/client'

export const authApi = {
  async login(input: { login: string; password: string }) {
    return unwrap(await api.api.v1.auth.login.post(input)).user
  },
  async register(input: { login: string; password: string; firstName: string; lastName: string }) {
    return unwrap(await api.api.v1.auth.register.post(input)).user
  },
}
