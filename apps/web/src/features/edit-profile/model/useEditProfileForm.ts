import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { type ProfileDto, type ProfilePatch, USER_GATEWAY, userHandle } from '@/entities/user'
import { useService } from '@/shared/di'
import { codeOf, fieldFor, messageFor, type ProfileField } from './errors'

export type ProfileFormField = Exclude<ProfileField, 'form'>
type Values = Record<ProfileFormField, string>

const SCREEN_NAME_RE = /^[a-z][a-z0-9_.]{2,31}$/
const STATUS_MAX = 140
const BIO_MAX = 2000

function toValues(profile: ProfileDto): Values {
  return {
    status: profile.status ?? '',
    bio: profile.bio ?? '',
    city: profile.city ?? '',
    birthday: profile.birthday ?? '',
    screenName: profile.screenName ?? '',
  }
}

/** Mirrors the backend's own checks (`User.updateProfile`) so obvious mistakes never round-trip. */
function clientError(values: Values): { field: ProfileFormField; text: string } | null {
  if (values.status.length > STATUS_MAX)
    return { field: 'status', text: messageFor('status_too_long') }
  if (values.bio.length > BIO_MAX) return { field: 'bio', text: messageFor('bio_too_long') }
  const screenName = values.screenName.trim()
  if (screenName.length > 0 && !SCREEN_NAME_RE.test(screenName.toLowerCase()))
    return { field: 'screenName', text: messageFor('invalid_screen_name') }
  return null
}

/** Only the fields that actually changed go on the wire; an emptied field is sent as `null`. */
function diff(initial: Values, values: Values): ProfilePatch {
  const patch: ProfilePatch = {}
  for (const field of Object.keys(values) as ProfileFormField[]) {
    if (values[field] === initial[field]) continue
    const trimmed = field === 'screenName' ? values[field].trim() : values[field]
    patch[field] = trimmed.length === 0 ? null : trimmed
  }
  return patch
}

export function useEditProfileForm(profile: ProfileDto): {
  values: Values
  errors: Partial<Record<ProfileFormField, string>>
  formError: string | null
  busy: boolean
  setField: (field: ProfileFormField, value: string) => void
  submit: (e?: { preventDefault(): void }) => Promise<void>
} {
  const gateway = useService(USER_GATEWAY)
  const { setUser } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const initial = toValues(profile)
  const [values, setValues] = useState(initial)
  const [fieldError, setFieldError] = useState<{ field: ProfileFormField; text: string } | null>(
    null,
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const setField = useCallback((field: ProfileFormField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    setFieldError(null)
    setFormError(null)
  }, [])

  const submit = useCallback(
    async (e?: { preventDefault(): void }) => {
      e?.preventDefault()
      setFieldError(null)
      setFormError(null)

      const invalid = clientError(values)
      if (invalid) {
        setFieldError(invalid)
        return
      }

      const patch = diff(initial, values)
      if (Object.keys(patch).length === 0) return

      setBusy(true)
      try {
        const updated = await gateway.updateProfile(patch)
        setUser({
          id: updated.id,
          login: updated.login,
          firstName: updated.firstName,
          lastName: updated.lastName,
          screenName: updated.screenName,
          createdAt: updated.createdAt,
        })
        queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'user' })
        queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'handle' })
        navigate(`/${userHandle(updated)}`)
      } catch (err) {
        const code = codeOf(err)
        const field = fieldFor(code)
        if (field === 'form') setFormError(messageFor(code))
        else setFieldError({ field, text: messageFor(code) })
      } finally {
        setBusy(false)
      }
    },
    [gateway, values, initial, setUser, queryClient, navigate],
  )

  const errors: Partial<Record<ProfileFormField, string>> = fieldError
    ? { [fieldError.field]: fieldError.text }
    : {}

  return { values, errors, formError, busy, setField, submit }
}
