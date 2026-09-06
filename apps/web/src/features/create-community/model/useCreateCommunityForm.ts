import { useQueryClient } from '@tanstack/react-query'
import { TOPICS, type Topic } from '@vkc/contracts'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  COMMUNITY_GATEWAY,
  type CommunityDto,
  type CreateCommunityInput,
  communityHandle,
} from '@/entities/community'
import { useService } from '@/shared/di'
import { queryKeys } from '@/shared/lib'
import { type CommunityField, codeOf, fieldFor, messageFor } from './errors'

export type CommunityFormField = Exclude<CommunityField, 'form'>
type Values = { name: string; screenName: string; topic: string; description: string }

const SCREEN_NAME_RE = /^[a-z][a-z0-9_.]{2,31}$/
const NAME_MIN = 2
const NAME_MAX = 120

const EMPTY: Values = { name: '', screenName: '', topic: TOPICS[0], description: '' }

/** Mirrors the backend's `Community.create` checks so obvious mistakes never round-trip. */
function clientError(values: Values): { field: CommunityFormField; text: string } | null {
  const name = values.name.trim()
  if (name.length < NAME_MIN || name.length > NAME_MAX)
    return { field: 'name', text: messageFor('invalid_community_name') }
  const screenName = values.screenName.trim()
  if (!SCREEN_NAME_RE.test(screenName.toLowerCase()))
    return { field: 'screenName', text: messageFor('invalid_screen_name') }
  return null
}

export function useCreateCommunityForm(onCreated: (c: CommunityDto) => void): {
  values: Values
  errors: Partial<Record<CommunityFormField, string>>
  formError: string | null
  busy: boolean
  setField: (field: CommunityFormField, value: string) => void
  submit: (e?: { preventDefault(): void }) => Promise<void>
} {
  const gateway = useService(COMMUNITY_GATEWAY)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [values, setValues] = useState<Values>(EMPTY)
  const [fieldError, setFieldError] = useState<{
    field: CommunityFormField
    text: string
  } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const setField = useCallback((field: CommunityFormField, value: string) => {
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

      setBusy(true)
      try {
        const description = values.description.trim()
        const input: CreateCommunityInput = {
          name: values.name.trim(),
          screenName: values.screenName.trim().toLowerCase(),
          topic: values.topic as Topic,
          description: description.length === 0 ? null : description,
        }
        const created = await gateway.create(input)
        queryClient.invalidateQueries({ queryKey: queryKeys.community.mine })
        onCreated(created)
        navigate(`/${communityHandle(created)}`)
      } catch (err) {
        const code = codeOf(err)
        const field = fieldFor(code)
        if (field === 'form') setFormError(messageFor(code))
        else setFieldError({ field, text: messageFor(code) })
      } finally {
        setBusy(false)
      }
    },
    [gateway, values, queryClient, onCreated, navigate],
  )

  const errors: Partial<Record<CommunityFormField, string>> = fieldError
    ? { [fieldError.field]: fieldError.text }
    : {}

  return { values, errors, formError, busy, setField, submit }
}
