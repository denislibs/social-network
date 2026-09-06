import { NotFoundError } from '../../../../kernel/errors'
import type { Query } from '../../../../kernel/query-bus'
import type { SocialReadPort } from '../../../../kernel/social-read'
import type { ProfileDto } from '../dto'
import type { UserReadModel } from '../ports'

export class GetProfile implements Query<ProfileDto> {
  declare readonly __result: ProfileDto
  constructor(
    readonly idOrScreen: string,
    readonly viewer: number | null,
  ) {}
}

/**
 * `social` is resolved lazily (called, not captured at registration time) so identity's handler
 * registration does not depend on social-graph's bindings being in place yet — see
 * `application/register.ts`.
 */
export const getProfileHandler =
  (d: { usersRead: UserReadModel; social: () => SocialReadPort }) =>
  async (q: GetProfile): Promise<ProfileDto> => {
    const base = await d.usersRead.getProfile(q.idOrScreen)
    if (!base) throw new NotFoundError('user_not_found', 'User not found')
    const [relation, counters] = await Promise.all([
      d.social().relation(q.viewer, base.id),
      d.social().counters(base.id),
    ])
    return { ...base, relation, counters }
  }
