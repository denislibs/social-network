export type Relation = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self'
export type Counters = {
  friends: number
  followers: number
  communities: number
  incomingRequests: number
}

/** Cross-context read port: identity's GetProfile needs relation/counters owned by social-graph. */
export interface SocialReadPort {
  relation(me: number | null, other: number): Promise<Relation>
  counters(userId: number): Promise<Counters>
}
