import { Button } from '@vkontakte/vkui'
import type { CommunityDto } from '@/entities/community'
import { useFollowCommunity } from '../model/useFollowCommunity'

export function FollowButton({ community }: { community: CommunityDto }) {
  const { label, onClick, busy } = useFollowCommunity(community)

  return (
    <Button mode="secondary" size="s" loading={busy} onClick={onClick}>
      {label}
    </Button>
  )
}
