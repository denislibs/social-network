import type { NotificationKind } from '@vkc/contracts'
import { type CursorKey, decodeCursor, encodeCursor, PAGE_SIZE } from '../../../../kernel/cursor'
import type { NotificationDto, Page, UserCellDto } from '../dto'
import type { NotificationReadModel, NotificationRepository } from '../ports'

type Row = {
  id: number
  userId: number
  kind: NotificationKind
  actorId: number | null
  groupKey: string | null
  payload: Record<string, unknown>
  createdAt: Date
  readAt: Date | null
}

/** Bare-bones actor stand-in — the fake has no `users` table to join against, so only `id`
 * carries real information; every other field is a placeholder. Good enough for application
 * tests, which only assert on `actor.id`. */
function stubActor(id: number): UserCellDto {
  return {
    id,
    firstName: '',
    lastName: '',
    screenName: null,
    city: null,
    isVerified: false,
    lastSeenAt: null,
  }
}

function before(r: Row, k: CursorKey): boolean {
  return (
    r.createdAt.getTime() < k.createdAt.getTime() ||
    (r.createdAt.getTime() === k.createdAt.getTime() && r.id < k.id)
  )
}

function toDto(r: Row): NotificationDto {
  return {
    id: r.id,
    kind: r.kind,
    createdAt: r.createdAt.toISOString(),
    readAt: r.readAt ? r.readAt.toISOString() : null,
    actor: r.actorId === null ? null : stubActor(r.actorId),
    payload: r.payload,
  }
}

/**
 * Implements both `NotificationRepository` and `NotificationReadModel` over one array, so a
 * write made through the repository port is immediately visible to a read made through the
 * read-model port — mirroring how the two Drizzle implementations share the same table.
 */
export class InMemoryNotifications implements NotificationRepository, NotificationReadModel {
  private rows: Row[] = []
  private seq = 0

  async insert(
    items: {
      userId: number
      kind: NotificationKind
      actorId: number | null
      groupKey?: string | null
      payload?: Record<string, unknown>
    }[],
  ): Promise<void> {
    for (const it of items) {
      this.rows.push({
        id: ++this.seq,
        userId: it.userId,
        kind: it.kind,
        actorId: it.actorId,
        groupKey: it.groupKey ?? null,
        payload: it.payload ?? {},
        createdAt: new Date(),
        readAt: null,
      })
    }
  }

  async markRead(userId: number, uptoId: number): Promise<void> {
    for (const r of this.rows) {
      if (r.userId === userId && r.id <= uptoId && r.readAt === null) r.readAt = new Date()
    }
  }

  async unreadCount(userId: number): Promise<number> {
    return this.rows.filter((r) => r.userId === userId && r.readAt === null).length
  }

  async list(userId: number, cursor: string | null): Promise<Page<NotificationDto>> {
    const key = decodeCursor(cursor ?? undefined)
    const rows = this.rows
      .filter((r) => r.userId === userId && (!key || before(r, key)))
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
    const items = rows.slice(0, PAGE_SIZE)
    const nextCursor =
      rows.length > PAGE_SIZE
        ? encodeCursor({ createdAt: items.at(-1)!.createdAt, id: items.at(-1)!.id })
        : null
    return { items: items.map(toDto), nextCursor }
  }
}
