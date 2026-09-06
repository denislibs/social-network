import { useSearchParams } from 'react-router'

export type CommunitiesTab = 'mine' | 'search'

function parseTab(value: string | null): CommunitiesTab {
  return value === 'search' ? 'search' : 'mine'
}

export function useCommunitiesTab(): {
  tab: CommunitiesTab
  setTab: (tab: CommunitiesTab) => void
} {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))
  const setTab = (next: CommunitiesTab) => setSearchParams(next === 'mine' ? {} : { tab: next })
  return { tab, setTab }
}
