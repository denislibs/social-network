import { NotFoundError } from '../../../../kernel/errors'
import type { Query } from '../../../../kernel/query-bus'
import type { UserDto } from '../dto'
import type { UserReadModel } from '../ports'
export class GetMe implements Query<UserDto> {
  declare readonly __result: UserDto
  constructor(readonly userId: number) {}
}
export const getMeHandler = (d: { usersRead: UserReadModel }) => async (q: GetMe) => {
  const dto = await d.usersRead.getMe(q.userId)
  if (!dto) throw new NotFoundError('user_not_found', 'User not found')
  return dto
}
