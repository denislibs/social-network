import { NotFoundError } from '../../../../kernel/errors'
import type { Query } from '../../../../kernel/query-bus'
import { toUserDto, type UserDto } from '../dto'
import type { UserRepository } from '../ports'
export class GetMe implements Query<UserDto> {
  declare readonly __result: UserDto
  constructor(readonly userId: number) {}
}
export const getMeHandler = (d: { users: UserRepository }) => async (q: GetMe) => {
  const u = await d.users.findById(q.userId)
  if (!u) throw new NotFoundError('user_not_found', 'User not found')
  return toUserDto(u)
}
