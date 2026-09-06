import type { Query } from '../../../../kernel/query-bus'
import type { UserCellDto } from '../dto'
import type { UserReadModel } from '../ports'

export class SearchUsers implements Query<UserCellDto[]> {
  declare readonly __result: UserCellDto[]
  constructor(
    readonly q: string,
    readonly limit: number = 10,
  ) {}
}

export const searchUsersHandler =
  (d: { usersRead: UserReadModel }) =>
  async (query: SearchUsers): Promise<UserCellDto[]> =>
    d.usersRead.searchUsers(query.q, query.limit)
