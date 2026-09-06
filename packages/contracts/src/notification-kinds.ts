export const NOTIFICATION_KINDS = [
  'friend_request',
  'friend_accepted',
  'new_follower',
  'community_invite',
  'post_like',
  'comment_like',
  'post_comment',
  'comment_reply',
  'mention',
  'repost',
  'community_post',
  'birthday',
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]
