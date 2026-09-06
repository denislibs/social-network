/**
 * Central TanStack Query key factory. Keeping every key here (rather than scattered
 * across features) makes invalidation call sites greppable and keeps the tuple shapes
 * (and their `as const` literal typing) consistent across the app.
 */
export const queryKeys = {
  user: {
    profile: (handle: string) => ['user', handle] as const,
    handle: (handle: string) => ['handle', handle] as const,
    friends: (id: number) => ['friends', id] as const,
    friendsPreview: (id: number) => ['friends', 'preview', id] as const,
    followers: (id: number) => ['followers', id] as const,
    counters: (id: number) => ['counters', id] as const,
    relation: (id: number) => ['relation', id] as const,
    requests: (dir: 'incoming' | 'outgoing') => ['requests', dir] as const,
    suggestions: ['suggestions'] as const,
  },
  community: {
    get: (handle: string) => ['community', handle] as const,
    members: (id: number) => ['community', 'members', id] as const,
    mine: ['communities', 'mine'] as const,
  },
  notifications: {
    unread: ['notifications', 'unread'] as const,
    list: ['notifications', 'list'] as const,
  },
  search: (q: string, kind: string) => ['search', kind, q] as const,
}
