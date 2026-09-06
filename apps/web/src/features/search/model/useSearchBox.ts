import { type ChangeEvent, type KeyboardEvent, useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

export function useSearchBox(): {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
} {
  const navigate = useNavigate()
  const [value, setValue] = useState('')

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }, [])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      const trimmed = value.trim()
      if (trimmed.length === 0) return
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    },
    [navigate, value],
  )

  return { value, onChange, onKeyDown }
}
