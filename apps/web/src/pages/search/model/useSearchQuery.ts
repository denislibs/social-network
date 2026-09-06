import { useSearchParams } from 'react-router'
import type { SearchKind } from '@/features/search'

function parseKind(value: string | null): SearchKind {
  return value === 'users' || value === 'communities' ? value : 'all'
}

export function useSearchQuery(): {
  q: string
  kind: SearchKind
  setKind: (kind: SearchKind) => void
} {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const kind = parseKind(searchParams.get('kind'))

  const setKind = (next: SearchKind) => {
    const params: Record<string, string> = { q }
    if (next !== 'all') params.kind = next
    setSearchParams(params)
  }

  return { q, kind, setKind }
}
