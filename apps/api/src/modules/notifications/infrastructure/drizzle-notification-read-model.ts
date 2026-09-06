import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { notifications, users } from '../../../db/schema'
import { type CursorKey, decodeCursor, encodeCursor, PAGE_SIZE } from '../../../kernel/cursor'
import type { NotificationDto, Page, UserCellDto } from '../application/dto'
import type { NotificationReadModel } from '../application/ports'

/**
 * Fetches `PAGE_SIZE + 1` rows ordered by the same key `keyOf` reads back — same convention as
 * social-graph's `DrizzleSocialReadModel.paginate`: the extra row only proves a next page exists,
 * `nextCursor` is built from the last row actually *returned* so the keyset's strict `<` doesn't
 * skip a row at the boundary.
 */
function paginate<R>(rows: R[], keyOf: (r: R) => CursorKey): Page<R> {
  if (rows.length > PAGE_SIZE) {
    const items = rows.slice(0, PAGE_SIZE)
    return { items, nextCursor: encodeCursor(keyOf(items[PAGE_SIZE - 1] as R)) }
  }
  return { items: rows, nextCursor: null }
}

function toActor(r: {
  actorId: number | null
  actorFirstName: string | null
  actorLastName: string | null
  actorScreenName: string | null
  actorCity: string | null
  actorIsVerified: boolean | null
  actorLastSeenAt: Date | string | null
}): UserCellDto | null {
  if (r.actorId === null) return null
  return {
    id: r.actorId,
    firstName: r.actorFirstName ?? '',
    lastName: r.actorLastName ?? '',
    screenName: r.actorScreenName,
    city: r.actorCity,
    isVerified: r.actorIsVerified ?? false,
    lastSeenAt: r.actorLastSeenAt ? new Date(r.actorLastSeenAt).toISOString() : null,
  }
}

export class DrizzleNotificationReadModel implements NotificationReadModel {
  constructor(private db: Db) {}

  async unreadCount(userId: number): Promise<number> {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    return row?.n ?? 0
  }

  async list(userId: number, cursor: string | null): Promise<Page<NotificationDto>> {
    const key = decodeCursor(cursor ?? undefined)
    const rows = await this.db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        payload: notifications.payload,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
        actorId: notifications.actorId,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
        actorScreenName: users.screenName,
        actorCity: users.city,
        actorIsVerified: users.isVerified,
        actorLastSeenAt: users.lastSeenAt,
      })
      .from(notifications)
      .leftJoin(users, eq(users.id, notifications.actorId))
      .where(
        and(
          eq(notifications.userId, userId),
          key
            ? sql`(${notifications.createdAt}, ${notifications.id}) < (${key.createdAt.toISOString()}::timestamptz, ${key.id})`
            : undefined,
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(PAGE_SIZE + 1)

    const page = paginate(rows, (r) => ({ createdAt: r.createdAt, id: r.id }))
    return {
      items: page.items.map((r) => ({
        id: r.id,
        kind: r.kind,
        createdAt: r.createdAt.toISOString(),
        readAt: r.readAt ? r.readAt.toISOString() : null,
        actor: toActor(r),
        payload: r.payload,
      })),
      nextCursor: page.nextCursor,
    }
  }
}
