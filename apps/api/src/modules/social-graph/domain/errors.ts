import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../../kernel/errors'

export class SelfFriendshipError extends AppError {
  constructor() {
    super('self_friendship', 'Cannot befriend yourself', 400)
  }
}
export class FriendshipNotFound extends NotFoundError {
  constructor() {
    super('friendship_not_found', 'Friendship not found')
  }
}
export class NotRequestAddressee extends ForbiddenError {
  constructor() {
    super('not_addressee', 'Not the addressee of this request')
  }
}
export class RequestCooldown extends ConflictError {
  constructor() {
    super('request_cooldown', 'Request can be repeated after 24 hours')
  }
}
export class LastAdminCannotLeave extends ConflictError {
  constructor() {
    super('last_admin', 'Last admin cannot leave the community')
  }
}
export class CommunityNotFound extends NotFoundError {
  constructor() {
    super('community_not_found', 'Community not found')
  }
}
