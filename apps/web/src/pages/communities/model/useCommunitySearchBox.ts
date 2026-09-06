import { type ChangeEvent, useCallback, useState } from 'react'

/** Plain local input state: `useSearch` (via `SearchResults`) already handles the debounce
 * with `useDeferredValue`, so this hook has nothing more to do than track the raw value. */
export function useCommunitySearchBox(): {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
} {
  const [value, setValue] = useState('')
  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value), [])
  return { value, onChange }
}
