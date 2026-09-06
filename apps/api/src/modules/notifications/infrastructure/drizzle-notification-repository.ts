import { and, eq, isNull, lte } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import type { NotificationKind } from '../../../db/schema'
import { notifications } from '../../../db/schema'
import type { NotificationRepository } from '../application/ports'

export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(private db: Db) {}

  async insert(
    rows: {
      userId: number
      kind: NotificationKind
      actorId: number | null
      groupKey?: string | null
      payload?: Record<string, unknown>
    }[],
  ): Promise<void> {
    if (rows.length === 0) return
    await this.db.insert(notifications).values(
      rows.map((r) => ({
        userId: r.userId,
        kind: r.kind,
        actorId: r.actorId,
        groupKey: r.groupKey ?? null,
        payload: r.payload ?? {},
      })),
    )
  }

  async markRead(userId: number, uptoId: number): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          lte(notifications.id, uptoId),
          isNull(notifications.readAt),
        ),
      )
  }
}
