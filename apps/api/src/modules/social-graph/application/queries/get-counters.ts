import type { Query } from '../../../../kernel/query-bus'
import type { Counters } from '../../../../kernel/social-read'
import type { SocialReadModel } from '../ports'

export class GetCounters implements Query<Counters> {
  declare readonly __result: Counters
  constructor(readonly userId: number) {}
}

export const getCountersHandler =
  (d: { read: SocialReadModel }) =>
  async (q: GetCounters): Promise<Counters> =>
    d.read.counters(q.userId)
