import { useSearchParams } from 'react-router'

export type FriendsTab = 'all' | 'requests' | 'suggestions'

export const FRIENDS_TABS: { id: FriendsTab; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'requests', label: 'Заявки' },
  { id: 'suggestions', label: 'Рекомендации' },
]

function parseTab(value: string | null): FriendsTab {
  return value === 'requests' || value === 'suggestions' ? value : 'all'
}

export function useFriendsTab(): { tab: FriendsTab; setTab: (tab: FriendsTab) => void } {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))
  const setTab = (next: FriendsTab) => setSearchParams(next === 'all' ? {} : { tab: next })
  return { tab, setTab }
}
