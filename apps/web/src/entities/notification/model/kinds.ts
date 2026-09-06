import {
  Icon28CommentOutline,
  Icon28GiftOutline,
  Icon28LikeOutline,
  Icon28MentionOutline,
  // `Icon28NotificationOutline` does not exist in @vkontakte/icons 3.69 (no outline
  // variant was ever published for this glyph) — `Icon28Notification` (filled) is
  // the closest match and is used only for the unknown-kind fallback.
  Icon28Notification,
  Icon28ShareOutline,
  Icon28UserAddOutline,
  Icon28UsersOutline,
} from '@vkontakte/icons'
import type { ComponentType } from 'react'
import type { NotificationDto, NotificationKind, UserCellDto } from './types'

export type NotificationDescriptor = {
  Icon: ComponentType<{ width?: number; height?: number }>
  text: string
  href: string
}

function actorName(actor: UserCellDto): string {
  return `${actor.firstName} ${actor.lastName}`
}

/** Prefixes `verb` with "First Last " when an actor is present, per VK's own notification copy. */
function withActor(n: NotificationDto, verb: string): string {
  return n.actor ? `${actorName(n.actor)} ${verb}` : verb
}

function actorHandle(actor: UserCellDto): string {
  return actor.screenName ?? `id${actor.id}`
}

/** Actor's own profile — used by kinds that are fundamentally "about" the actor. */
function actorHref(n: NotificationDto): string {
  return n.actor ? `/${actorHandle(n.actor)}` : '/notifications'
}

type CommunityInvitePayload = {
  communityId?: number
  communityName?: string
  communityScreenName?: string | null
}

function communityInviteHref(n: NotificationDto): string {
  const p = n.payload as CommunityInvitePayload
  if (p.communityScreenName) return `/${p.communityScreenName}`
  if (p.communityId != null) return `/club${p.communityId}`
  return '/notifications'
}

function communityName(n: NotificationDto): string {
  return (n.payload as CommunityInvitePayload).communityName ?? ''
}

/**
 * Every post/comment kind (likes, comments, mentions, reposts, community feed posts)
 * links to `/post<id>` — a placeholder route subsystem 3 (posts) will add a real page
 * for. `payload.postId` is this module's own convention; posts/notifications don't
 * exist yet on the backend beyond `friend_request`/`friend_accepted`, so there is no
 * wire contract to match yet.
 */
function postHref(n: NotificationDto): string {
  const postId = (n.payload as { postId?: number }).postId
  return postId != null ? `/post${postId}` : '/notifications'
}

const KIND_TABLE: Partial<
  Record<NotificationKind, (n: NotificationDto) => NotificationDescriptor>
> = {
  friend_request: (n) => ({
    Icon: Icon28UserAddOutline,
    text: withActor(n, 'хочет добавить вас в друзья'),
    href: '/friends?tab=requests',
  }),
  friend_accepted: (n) => ({
    Icon: Icon28UsersOutline,
    text: withActor(n, 'принял(а) вашу заявку'),
    href: actorHref(n),
  }),
  new_follower: (n) => ({
    Icon: Icon28UserAddOutline,
    text: withActor(n, 'подписался(ась) на вас'),
    href: actorHref(n),
  }),
  community_invite: (n) => ({
    Icon: Icon28UsersOutline,
    text: withActor(n, `приглашает в сообщество ${communityName(n)}`),
    href: communityInviteHref(n),
  }),
  post_like: (n) => ({
    Icon: Icon28LikeOutline,
    text: withActor(n, 'оценил(а) вашу запись'),
    href: postHref(n),
  }),
  comment_like: (n) => ({
    Icon: Icon28LikeOutline,
    text: withActor(n, 'оценил(а) ваш комментарий'),
    href: postHref(n),
  }),
  post_comment: (n) => ({
    Icon: Icon28CommentOutline,
    text: withActor(n, 'прокомментировал(а) вашу запись'),
    href: postHref(n),
  }),
  comment_reply: (n) => ({
    Icon: Icon28CommentOutline,
    text: withActor(n, 'ответил(а) на ваш комментарий'),
    href: postHref(n),
  }),
  mention: (n) => ({
    Icon: Icon28MentionOutline,
    text: withActor(n, 'упомянул(а) вас'),
    href: postHref(n),
  }),
  repost: (n) => ({
    Icon: Icon28ShareOutline,
    text: withActor(n, 'поделился(ась) вашей записью'),
    href: postHref(n),
  }),
  community_post: (n) => ({
    Icon: Icon28UsersOutline,
    text: 'новая запись в сообществе',
    href: postHref(n),
  }),
  birthday: (n) => ({
    Icon: Icon28GiftOutline,
    text: withActor(n, 'сегодня день рождения'),
    href: actorHref(n),
  }),
}

export function describeNotification(n: NotificationDto): NotificationDescriptor {
  const build = KIND_TABLE[n.kind]
  if (build) return build(n)
  return { Icon: Icon28Notification, text: 'Новое уведомление', href: '/notifications' }
}
