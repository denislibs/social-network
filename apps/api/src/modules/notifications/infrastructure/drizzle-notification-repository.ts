import type { NotificationKind } from '@vkc/contracts'
import { and, eq, isNull, lte } from 'drizzle-orm'
import type { Db } from '../../../db/client'
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
    // `notifications_dedupe_uq` (migration 0004) is a partial unique index on
    // (user_id, kind, actor_id) WHERE read_at IS NULL, so a duplicate delivery of the same event
    // — an at-least-once subscriber, a retried publish, a double-submitted request — collides
    // with the still-unread row and is dropped instead of piling up. Once the user has read it,
    // the index no longer covers that row and a genuinely new event notifies again.
    await this.db
      .insert(notifications)
      .values(
        rows.map((r) => ({
          userId: r.userId,
          kind: r.kind,
          actorId: r.actorId,
          groupKey: r.groupKey ?? null,
          payload: r.payload ?? {},
        })),
      )
      .onConflictDoNothing()
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
