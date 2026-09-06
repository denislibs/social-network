import type { Topic } from '@vkc/contracts'
import { TOPICS } from '@vkc/contracts'
import { pgEnum } from 'drizzle-orm/pg-core'

export type { Topic }
export { TOPICS }
export const topicEnum = pgEnum('topic', TOPICS)
export const authorTypeEnum = pgEnum('author_type', ['user', 'community'])
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'declined'])
export const followTargetEnum = pgEnum('follow_target', ['user', 'community'])
export const memberRoleEnum = pgEnum('member_role', ['member', 'editor', 'admin'])
export const likeTargetEnum = pgEnum('like_target', ['post', 'comment'])
export const mediaKindEnum = pgEnum('media_kind', ['photo', 'audio', 'avatar', 'cover'])
export const eventKindEnum = pgEnum('event_kind', [
  'view',
  'like',
  'comment',
  'repost',
  'click',
  'hide',
])
export const modelKindEnum = pgEnum('model_kind', ['feed_ranker', 'pymk_ranker'])
