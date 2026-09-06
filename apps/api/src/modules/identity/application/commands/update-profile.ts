import type { Command } from '../../../../kernel/command-bus'
import { NotFoundError } from '../../../../kernel/errors'
import type { SocialReadPort } from '../../../../kernel/social-read'
import { type ProfileDto, toProfileDto } from '../dto'
import type { UserRepository } from '../ports'

export class UpdateProfile implements Command<ProfileDto> {
  declare readonly __result: ProfileDto
  constructor(
    readonly input: {
      me: number
      status?: string | null
      bio?: string | null
      city?: string | null
      birthday?: string | null
      screenName?: string | null
    },
  ) {}
}

/**
 * `social` is resolved lazily (called, not captured at registration time) so identity's handler
 * registration does not depend on social-graph's bindings being in place yet — see
 * `application/register.ts`.
 */
export function updateProfileHandler(d: { users: UserRepository; social: () => SocialReadPort }) {
  return async (cmd: UpdateProfile): Promise<ProfileDto> => {
    const { me, ...patch } = cmd.input
    const user = await d.users.findById(me)
    if (!user) throw new NotFoundError('user_not_found', 'User not found')
    user.updateProfile(patch)
    const saved = await d.users.save(user)
    const counters = await d.social().counters(me)
    return toProfileDto(saved, counters, 'self')
  }
}
