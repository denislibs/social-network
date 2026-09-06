import type { Topic } from '@vkc/contracts'

export type {
  CommunityCellDto,
  CommunityDto,
  Membership,
  Page,
  Topic,
  UserCellDto,
} from '@vkc/contracts'

export type CreateCommunityInput = {
  name: string
  screenName: string
  topic: Topic
  description?: string | null
}
