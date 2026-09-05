import type { DomainEvent } from '../../../kernel/event-bus'
export type UserRegistered = DomainEvent<'UserRegistered', { userId: number; login: string }>
export type UserLoggedIn = DomainEvent<'UserLoggedIn', { userId: number }>
