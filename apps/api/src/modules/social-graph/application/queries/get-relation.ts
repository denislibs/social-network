import type { Query } from '../../../../kernel/query-bus'
import type { Relation } from '../../../../kernel/social-read'
import type { SocialReadModel } from '../ports'

export class GetRelation implements Query<Relation> {
  declare readonly __result: Relation
  constructor(
    readonly me: number | null,
    readonly other: number,
  ) {}
}

export const getRelationHandler =
  (d: { read: SocialReadModel }) =>
  async (q: GetRelation): Promise<Relation> =>
    d.read.relation(q.me, q.other)
