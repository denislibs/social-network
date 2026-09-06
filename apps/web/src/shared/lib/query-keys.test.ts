import { describe, expect, it } from 'vitest'
import { queryKeys } from './query-keys'

describe('queryKeys', () => {
  it('user.profile is an `as const` tuple keyed by handle', () => {
    const key = queryKeys.user.profile('durov')
    expect(key).toEqual(['user', 'durov'])
    const typeCheck: readonly ['user', string] = key
    void typeCheck
  })

  it('user.handle is an `as const` tuple keyed by handle', () => {
    const key = queryKeys.user.handle('durov')
    expect(key).toEqual(['handle', 'durov'])
    const typeCheck: readonly ['handle', string] = key
    void typeCheck
  })

  it('user.requests is an `as const` tuple keyed by direction', () => {
    const key = queryKeys.user.requests('incoming')
    expect(key).toEqual(['requests', 'incoming'])
    const typeCheck: readonly ['requests', 'incoming' | 'outgoing'] = key
    void typeCheck
  })

  it('user.suggestions is a fixed `as const` tuple', () => {
    expect(queryKeys.user.suggestions).toEqual(['suggestions'])
    const typeCheck: readonly ['suggestions'] = queryKeys.user.suggestions
    void typeCheck
  })

  it('community.byId keeps the community prefix so membership predicates still match it', () => {
    const key = queryKeys.community.byId(7)
    expect(key).toEqual(['community', 'id', 7])
    expect(key[0]).toBe(queryKeys.community.get('kino')[0])
    const typeCheck: readonly ['community', 'id', number] = key
    void typeCheck
  })

  it('community.mine is a fixed `as const` tuple', () => {
    expect(queryKeys.community.mine).toEqual(['communities', 'mine'])
    const typeCheck: readonly ['communities', 'mine'] = queryKeys.community.mine
    void typeCheck
  })

  it('notifications.unread is a fixed `as const` tuple', () => {
    expect(queryKeys.notifications.unread).toEqual(['notifications', 'unread'])
    const typeCheck: readonly ['notifications', 'unread'] = queryKeys.notifications.unread
    void typeCheck
  })

  it('search combines kind and query into an `as const` tuple', () => {
    const key = queryKeys.search('durov', 'people')
    expect(key).toEqual(['search', 'people', 'durov'])
    const typeCheck: readonly ['search', string, string] = key
    void typeCheck
  })
})
