import type { Topic } from '@vkc/contracts'
import type { DomainEvent } from '../../../kernel/event-bus'
import { ScreenName } from '../../../kernel/screen-name'
import { LastAdminCannotLeave } from './errors'
import { CommunityName } from './value-objects'

export type MemberRole = 'member' | 'editor' | 'admin'

export type CommunityProps = {
  id: number | null
  screenName: string
  name: string
  description: string | null
  topic: Topic
  createdAt: Date
}

export class Community {
  private events: DomainEvent[] = []
  private constructor(
    private p: CommunityProps,
    private members: Map<number, MemberRole>,
  ) {}

  static create(
    input: {
      ownerId: number
      name: string
      screenName: string
      topic: Topic
      description: string | null
    },
    now = new Date(),
  ): Community {
    const name = CommunityName.create(input.name)
    const screenName = ScreenName.create(input.screenName)
    const c = new Community(
      {
        id: null,
        screenName: screenName.value,
        name: name.value,
        description: input.description,
        topic: input.topic,
        createdAt: now,
      },
      new Map([[input.ownerId, 'admin']]),
    )
    c.events.push({
      type: 'CommunityCreated',
      occurredAt: now,
      payload: { communityId: c.p.id as number, ownerId: input.ownerId },
    })
    return c
  }
  static rehydrate(p: {
    id: number | null
    screenName: string
    name: string
    description: string | null
    topic: Topic
    createdAt: Date
    members: Map<number, MemberRole>
  }): Community {
    return new Community(
      {
        id: p.id,
        screenName: p.screenName,
        name: p.name,
        description: p.description,
        topic: p.topic,
        createdAt: p.createdAt,
      },
      new Map(p.members),
    )
  }

  get props(): Readonly<CommunityProps> {
    return this.p
  }

  roleOf(userId: number): MemberRole | null {
    return this.members.get(userId) ?? null
  }
  adminCount(): number {
    let n = 0
    for (const role of this.members.values()) if (role === 'admin') n++
    return n
  }
  membersCount(): number {
    return this.members.size
  }
  assignId(id: number): void {
    this.p.id = id
    for (const e of this.events)
      if (e.type === 'CommunityCreated') (e.payload as { communityId: number }).communityId = id
  }
  join(userId: number, now = new Date()): void {
    if (this.members.has(userId)) return
    this.members.set(userId, 'member')
    this.events.push({
      type: 'CommunityJoined',
      occurredAt: now,
      payload: { communityId: this.p.id as number, userId },
    })
  }
  leave(userId: number, now = new Date()): void {
    const role = this.members.get(userId)
    if (!role) return
    if (role === 'admin' && this.adminCount() === 1) throw new LastAdminCannotLeave()
    this.members.delete(userId)
    this.events.push({
      type: 'CommunityLeft',
      occurredAt: now,
      payload: { communityId: this.p.id as number, userId },
    })
  }
  pullEvents(): DomainEvent[] {
    const out = this.events
    this.events = []
    return out
  }
}
