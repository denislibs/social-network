import { Button, Snackbar } from '@vkontakte/vkui'
import type { CommunityDto } from '@/entities/community'
import { useFollowCommunity } from '../model/useFollowCommunity'

export function FollowButton({ community }: { community: CommunityDto }) {
  const { label, onClick, busy, error, dismissError } = useFollowCommunity(community)

  return (
    <>
      <Button mode="secondary" size="s" loading={busy} onClick={onClick}>
        {label}
      </Button>
      {error !== null && <Snackbar onClosed={dismissError}>{error}</Snackbar>}
    </>
  )
}
