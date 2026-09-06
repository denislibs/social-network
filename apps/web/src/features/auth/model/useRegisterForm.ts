import { useCallback, useState } from 'react'
import type { UserDto } from '@/shared/api'
import { useService } from '@/shared/di'
import { codeOf, fieldFor, messageFor } from './errors'
import { AUTH_GATEWAY } from './ports'

export type RegisterField = 'login' | 'firstName' | 'lastName' | 'password'
export type FieldError = { field: 'login' | 'password' | 'form'; text: string }

const EMPTY: Record<RegisterField, string> = {
  login: '',
  firstName: '',
  lastName: '',
  password: '',
}

export function useRegisterForm(onSuccess: (u: UserDto) => void) {
  const auth = useService(AUTH_GATEWAY)
  const [values, setValues] = useState(EMPTY)
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)
  const setField = useCallback((field: RegisterField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    setError(null)
  }, [])
  const submit = useCallback(
    async (e?: { preventDefault(): void }) => {
      e?.preventDefault()
      setError(null)
      setBusy(true)
      try {
        onSuccess(await auth.register({ ...values, login: values.login.trim() }))
      } catch (err) {
        const code = codeOf(err)
        setError({ field: fieldFor(code), text: messageFor(code) })
      } finally {
        setBusy(false)
      }
    },
    [auth, onSuccess, values],
  )
  return { values, error, busy, setField, submit }
}
