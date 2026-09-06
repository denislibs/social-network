import { Icon24SearchOutline } from '@vkontakte/icons'
import { Button, Panel, PanelHeader, Search, Tabs, TabsItem } from '@vkontakte/vkui'
import { useState } from 'react'
import { CreateCommunityModal } from '@/features/create-community'
import { SearchResults } from '@/features/search'
import { CommunitiesList } from '@/widgets/communities-list'
import { useCommunitiesTab } from '../model/useCommunitiesTab'
import { useCommunitySearchBox } from '../model/useCommunitySearchBox'

export function CommunitiesPage() {
  const { tab, setTab } = useCommunitiesTab()
  const search = useCommunitySearchBox()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <Panel>
      <PanelHeader
        after={
          <Button mode="primary" size="s" onClick={() => setCreateOpen(true)}>
            Создать сообщество
          </Button>
        }
      >
        Сообщества
      </PanelHeader>
      <Tabs>
        <TabsItem id="mine" selected={tab === 'mine'} onClick={() => setTab('mine')}>
          Мои
        </TabsItem>
        <TabsItem id="search" selected={tab === 'search'} onClick={() => setTab('search')}>
          Поиск
        </TabsItem>
      </Tabs>
      {tab === 'mine' && <CommunitiesList />}
      {tab === 'search' && (
        <>
          <Search
            placeholder="Поиск сообществ"
            icon={<Icon24SearchOutline />}
            iconLabel="Найти"
            clearLabel="Очистить запрос"
            value={search.value}
            onChange={search.onChange}
          />
          <SearchResults q={search.value} kind="communities" />
        </>
      )}
      <CreateCommunityModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />
    </Panel>
  )
}
