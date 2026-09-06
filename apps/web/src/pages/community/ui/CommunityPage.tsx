import { Group, Placeholder } from '@vkontakte/vkui'

/**
 * Left (551px) column of a community page: just the wall placeholder, mirroring
 * `pages/profile/ui/ProfilePage`. The header itself and the right column are `AppShell` slots,
 * filled by `app/routes/HandleRoute` — vk.ru's community header spans both content columns too.
 */
export function CommunityPage() {
  return (
    <Group mode="card">
      <Placeholder title="Записей пока нет">Стена появится в подсистеме 3.</Placeholder>
    </Group>
  )
}
