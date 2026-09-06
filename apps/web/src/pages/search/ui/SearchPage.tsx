import { Panel, PanelHeader, Tabs, TabsItem } from '@vkontakte/vkui'
import { type SearchKind, SearchResults } from '@/features/search'
import { useSearchQuery } from '../model/useSearchQuery'

const TABS: { id: SearchKind; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'users', label: 'Люди' },
  { id: 'communities', label: 'Сообщества' },
]

export function SearchPage() {
  const { q, kind, setKind } = useSearchQuery()

  return (
    <Panel>
      <PanelHeader>Поиск</PanelHeader>
      <Tabs>
        {TABS.map((t) => (
          <TabsItem key={t.id} id={t.id} selected={kind === t.id} onClick={() => setKind(t.id)}>
            {t.label}
          </TabsItem>
        ))}
      </Tabs>
      <SearchResults q={q} kind={kind} />
    </Panel>
  )
}
