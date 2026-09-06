import { NotFoundError } from '../../../../kernel/errors'
import type { Query } from '../../../../kernel/query-bus'
import type { HandleDto } from '../dto'
import type { SocialReadModel } from '../ports'

export class ResolveHandle implements Query<HandleDto> {
  declare readonly __result: HandleDto
  constructor(readonly handle: string) {}
}

export const resolveHandleHandler =
  (d: { read: SocialReadModel }) =>
  async (q: ResolveHandle): Promise<HandleDto> => {
    const dto = await d.read.resolveHandle(q.handle)
    if (!dto) throw new NotFoundError('not_found', 'Nothing at this address')
    return dto
  }
