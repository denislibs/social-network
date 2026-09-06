import type { NotificationKind } from '@vkc/contracts'
import { describe, expect, it } from 'vitest'
import { describeNotification } from './kinds'
import type { NotificationDto } from './types'

const ACTOR = {
  id: 9,
  firstName: 'Аня',
  lastName: 'Смирнова',
  screenName: null,
  city: null,
  isVerified: false,
  lastSeenAt: null,
}

function makeNotification(
  kind: NotificationKind | string,
  overrides: Partial<NotificationDto> = {},
): NotificationDto {
  return {
    id: 1,
    kind: kind as NotificationKind,
    createdAt: '2026-09-06T12:00:00.000Z',
    readAt: null,
    actor: ACTOR,
    payload: {},
    ...overrides,
  }
}

describe('describeNotification', () => {
  it('friend_request: prompts to accept, links to the requests tab', () => {
    const { text, href, Icon } = describeNotification(makeNotification('friend_request'))
    expect(text).toContain('Аня')
    expect(text).toBe('Аня Смирнова хочет добавить вас в друзья')
    expect(href).toBe('/friends?tab=requests')
    expect(Icon).toBeDefined()
  })

  it('friend_accepted: links to the actor profile', () => {
    const { text, href } = describeNotification(makeNotification('friend_accepted'))
    expect(text).toBe('Аня Смирнова принял(а) вашу заявку')
    expect(href).toBe('/id9')
  })

  it('new_follower: links to the actor profile', () => {
    const { text, href } = describeNotification(makeNotification('new_follower'))
    expect(text).toBe('Аня Смирнова подписался(ась) на вас')
    expect(href).toBe('/id9')
  })

  it('community_invite: names the community, links to it', () => {
    const n = makeNotification('community_invite', {
      payload: { communityId: 2, communityName: 'Кино клуб', communityScreenName: null },
    })
    const { text, href } = describeNotification(n)
    expect(text).toBe('Аня Смирнова приглашает в сообщество Кино клуб')
    expect(href).toBe('/club2')
  })

  it('community_invite: prefers the community screen name when set', () => {
    const n = makeNotification('community_invite', {
      payload: { communityId: 2, communityName: 'Кино клуб', communityScreenName: 'kino' },
    })
    expect(describeNotification(n).href).toBe('/kino')
  })

  it('post_like: links to the post placeholder route', () => {
    const n = makeNotification('post_like', { payload: { postId: 42 } })
    const { text, href } = describeNotification(n)
    expect(text).toBe('Аня Смирнова оценил(а) вашу запись')
    expect(href).toBe('/post42')
  })

  it('comment_like', () => {
    const n = makeNotification('comment_like', { payload: { postId: 42 } })
    expect(describeNotification(n).text).toBe('Аня Смирнова оценил(а) ваш комментарий')
    expect(describeNotification(n).href).toBe('/post42')
  })

  it('post_comment', () => {
    const n = makeNotification('post_comment', { payload: { postId: 42 } })
    expect(describeNotification(n).text).toBe('Аня Смирнова прокомментировал(а) вашу запись')
    expect(describeNotification(n).href).toBe('/post42')
  })

  it('comment_reply', () => {
    const n = makeNotification('comment_reply', { payload: { postId: 42 } })
    expect(describeNotification(n).text).toBe('Аня Смирнова ответил(а) на ваш комментарий')
    expect(describeNotification(n).href).toBe('/post42')
  })

  it('mention', () => {
    const n = makeNotification('mention', { payload: { postId: 42 } })
    expect(describeNotification(n).text).toBe('Аня Смирнова упомянул(а) вас')
    expect(describeNotification(n).href).toBe('/post42')
  })

  it('repost', () => {
    const n = makeNotification('repost', { payload: { postId: 42 } })
    expect(describeNotification(n).text).toBe('Аня Смирнова поделился(ась) вашей записью')
    expect(describeNotification(n).href).toBe('/post42')
  })

  it('community_post: no actor prefix, links to the post', () => {
    const n = makeNotification('community_post', { actor: null, payload: { postId: 42 } })
    const { text, href } = describeNotification(n)
    expect(text).toBe('новая запись в сообществе')
    expect(href).toBe('/post42')
  })

  it('birthday: links to the actor profile', () => {
    const { text, href } = describeNotification(makeNotification('birthday'))
    expect(text).toBe('Аня Смирнова сегодня день рождения')
    expect(href).toBe('/id9')
  })

  it('falls back to a generic notification for an unknown kind', () => {
    const { text, href } = describeNotification(makeNotification('something_new_from_the_future'))
    expect(text).toBe('Новое уведомление')
    expect(href).toBe('/notifications')
  })

  it('uses the actor screen name in profile links when set', () => {
    const n = makeNotification('birthday', { actor: { ...ACTOR, screenName: 'anya' } })
    expect(describeNotification(n).href).toBe('/anya')
  })

  it('falls back to /notifications when an actor-profile kind has no actor', () => {
    const n = makeNotification('friend_accepted', { actor: null })
    expect(describeNotification(n).href).toBe('/notifications')
  })
})
