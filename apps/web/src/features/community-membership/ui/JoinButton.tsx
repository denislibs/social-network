import { Button, ButtonGroup, Snackbar } from '@vkontakte/vkui'
import type { CommunityDto } from '@/entities/community'
import { useJoinCommunity } from '../model/useJoinCommunity'

export function JoinButton({ community }: { community: CommunityDto }) {
  const { label, onClick, busy, secondary, error, dismissError } = useJoinCommunity(community)

  return (
    <>
      <ButtonGroup mode="horizontal" gap="s">
        <Button
          mode={secondary ? 'secondary' : 'primary'}
          size="s"
          loading={busy}
          disabled={!!secondary}
          onClick={onClick}
        >
          {label}
        </Button>
        {secondary && (
          <Button mode="tertiary" size="s" disabled={busy} onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
      </ButtonGroup>
      {error !== null && (
        <Snackbar onClose={dismissError} onClosed={dismissError}>
          {error}
        </Snackbar>
      )}
    </>
  )
}
